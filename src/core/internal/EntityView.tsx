import React, { useCallback, useEffect, useRef, useState } from "react";
import equal from "react-fast-compare";
import {
    Box,
    CircularProgress,
    Divider,
    IconButton,
    Tab,
    Tabs,
    Typography,
    useMediaQuery,
    useTheme
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import {
    Entity,
    EntityCollection,
    EntityStatus,
    EntityValues,
    ResolvedEntityCollection,
    User
} from "../../types";
import {
    CircularProgressCenter,
    EntityCollectionView,
    EntityPreview,
    ErrorBoundary
} from "../components";
import {
    canEditEntity,
    fullPathToCollectionSegments,
    getFistAdditionalView,
    removeInitialAndTrailingSlashes
} from "../util";

import {
    ADDITIONAL_TAB_WIDTH,
    CONTAINER_FULL_WIDTH,
    FORM_CONTAINER_WIDTH
} from "./common";
import {
    saveEntityWithCallbacks,
    useAuthController,
    useDataSource,
    useEntityFetch,
    useFireCMSContext,
    useSideEntityController,
    useSnackbarController
} from "../../hooks";
import { EntityForm } from "../../form";
import { useSideDialogContext } from "../SideDialogs";

export interface EntityViewProps<M extends Record<string, any>> {
    path: string;
    collection: EntityCollection<M>;
    entityId?: string;
    copy?: boolean;
    selectedSubPath?: string;
    formWidth?: number | string;
    onValuesAreModified: (modified: boolean) => void;
    onUpdate?: (params: { entity: Entity<any> }) => void;
    onClose?: () => void;
}

/**
 * This is the default view that is used as the content of a side panel when
 * an entity is opened.
 * You probably don't want to use this view directly since it is bound to the
 * side panel. Instead, you might want to use {@link EntityForm} or
 * {@link EntityCollectionView}
 */
export const EntityView = React.memo<EntityViewProps<any>>(
    function EntityView<M extends Record<string, any>, UserType extends User>({
                                                                                  path,
                                                                                  entityId,
                                                                                  selectedSubPath,
                                                                                  copy,
                                                                                  collection,
                                                                                  onValuesAreModified,
                                                                                  formWidth,
                                                                                  onUpdate,
                                                                                  onClose
                                                                              }: EntityViewProps<M>) {

        const theme = useTheme();
        const largeLayout = useMediaQuery(theme.breakpoints.up("lg"));
        const largeLayoutTabSelected = useRef(!largeLayout);

        const resolvedFormWidth: string = typeof formWidth === "number" ? `${formWidth}px` : formWidth ?? FORM_CONTAINER_WIDTH;

        const dataSource = useDataSource();
        const sideDialogContext = useSideDialogContext();
        const sideEntityController = useSideEntityController();
        const snackbarController = useSnackbarController();
        const context = useFireCMSContext();
        const authController = useAuthController<UserType>();

        const [status, setStatus] = useState<EntityStatus>(copy ? "copy" : (entityId ? "existing" : "new"));
        const [currentEntityId, setCurrentEntityId] = useState<string | undefined>(entityId);

        const modifiedValuesRef = useRef<EntityValues<M> | undefined>(undefined);
        const modifiedValues = modifiedValuesRef.current;

        const subcollections = (collection.subcollections ?? []).filter(c => !c.hideFromNavigation);
        const subcollectionsCount = subcollections?.length ?? 0;
        const customViews = collection.views;
        const customViewsCount = customViews?.length ?? 0;

        const hasAdditionalViews = customViewsCount > 0 || subcollectionsCount > 0;
        const fistAdditionalView = getFistAdditionalView(collection);

        const selectFirstTab = !selectedSubPath && largeLayout && fistAdditionalView;
        const [tabsPosition, setTabsPosition] = React.useState(selectFirstTab ? 0 : -1);

        const mainViewVisible = tabsPosition === -1 || largeLayout;

        const {
            entity,
            dataLoading,
            // eslint-disable-next-line no-unused-vars
            dataLoadingError
        } = useEntityFetch<M, UserType>({
            path,
            entityId: currentEntityId,
            collection,
            useCache: false
        });

        const [usedEntity, setUsedEntity] = useState<Entity<M> | undefined>(entity);
        const [readOnly, setReadOnly] = useState<boolean | undefined>(undefined);

        useEffect(() => {
            if (entity)
                setUsedEntity(entity);
        }, [entity]);

        useEffect(() => {
            if (status === "new") {
                setReadOnly(false);
            } else {
                const editEnabled = usedEntity ? canEditEntity(collection, authController, fullPathToCollectionSegments(path), usedEntity ?? null) : false;
                if (usedEntity)
                    setReadOnly(!editEnabled);
            }
        }, [authController, usedEntity, status]);

        useEffect(() => {
            if (!selectedSubPath)
                setTabsPosition(-1);
            else {
                if (customViews) {
                    const index = customViews
                        .map((c) => c.path)
                        .findIndex((p) => p === selectedSubPath);
                    if (index !== -1)
                        setTabsPosition(index);
                }

                if (subcollections) {
                    const index = subcollections
                        .map((c) => c.path)
                        .findIndex((p) => p === selectedSubPath);
                    if (index !== -1)
                        setTabsPosition(index + customViewsCount);
                }
            }
        }, [selectedSubPath, customViewsCount, customViews, subcollections]);

        useEffect(() => {
            if (largeLayoutTabSelected.current === largeLayout)
                return;

            // open first tab by default in  large layouts
            if (!selectedSubPath && largeLayout && fistAdditionalView)
                sideEntityController.replace({
                    path,
                    entityId,
                    selectedSubPath: fistAdditionalView.path,
                    updateUrl: true
                });
            // set form view by default in small layouts
            else if (tabsPosition === 0 && !largeLayout && fistAdditionalView)
                sideEntityController.replace({
                    path,
                    entityId,
                    selectedSubPath: undefined,
                    updateUrl: true
                });
            largeLayoutTabSelected.current = largeLayout;
        }, [largeLayout, tabsPosition, fistAdditionalView, largeLayoutTabSelected.current, selectedSubPath]);

        const onPreSaveHookError = useCallback((e: Error) => {
            snackbarController.open({
                type: "error",
                message: "Error before saving: " + e?.message
            });
            console.error(e);
        }, [snackbarController]);

        const onSaveSuccessHookError = useCallback((e: Error) => {
            snackbarController.open({
                type: "error",
                message: "Error after saving (entity is saved): " + e?.message
            });
            console.error(e);
        }, [snackbarController]);

        const onSaveSuccess = (updatedEntity: Entity<M>, closeAfterSave: boolean) => {

            snackbarController.open({
                type: "success",
                message: `${collection.singularName ?? collection.name}: Saved correctly`
            });

            setCurrentEntityId(updatedEntity.id);
            setUsedEntity(updatedEntity);
            setStatus("existing");

            onValuesAreModified(false);

            if (onUpdate)
                onUpdate({ entity: updatedEntity });

            if (closeAfterSave) {
                sideDialogContext.setBlocked(false);
                sideDialogContext.close(true);
                onClose?.();
            }

        };

        const onSaveFailure = useCallback((e: Error) => {

            snackbarController.open({
                type: "error",
                message: "Error saving: " + e?.message
            });

            console.error("Error saving entity", path, entityId);
            console.error(e);
        }, [entityId, path, snackbarController]);

        const onEntitySave = useCallback(async ({
                                                    collection,
                                                    path,
                                                    entityId,
                                                    values,
                                                    previousValues,
                                                    closeAfterSave
                                                }: {
            collection: ResolvedEntityCollection<M>,
            path: string,
            entityId: string | undefined,
            values: EntityValues<M>,
            previousValues?: EntityValues<M>,
            closeAfterSave: boolean
        }): Promise<void> => {

            if (!status)
                return;

            return saveEntityWithCallbacks({
                path,
                entityId,
                values,
                previousValues,
                collection,
                status,
                dataSource,
                context,
                onSaveSuccess: (updatedEntity: Entity<M>) => onSaveSuccess(updatedEntity, closeAfterSave),
                onSaveFailure,
                onPreSaveHookError,
                onSaveSuccessHookError
            });
        }, [status, collection, dataSource, context, onSaveSuccess, onSaveFailure, onPreSaveHookError, onSaveSuccessHookError]);

        const customViewsView: React.ReactNode[] | undefined = customViews && customViews.map(
            (customView, colIndex) => {
                return (
                    <Box
                        sx={{
                            width: ADDITIONAL_TAB_WIDTH,
                            height: "100%",
                            overflow: "auto",
                            borderLeft: `1px solid ${theme.palette.divider}`,
                            [theme.breakpoints.down("lg")]: {
                                borderLeft: "inherit",
                                width: CONTAINER_FULL_WIDTH
                            }
                        }}
                        key={`custom_view_${customView.path}_${colIndex}`}
                        role="tabpanel"
                        flexGrow={1}
                        hidden={tabsPosition !== colIndex}>
                        <ErrorBoundary>
                            {customView.builder({
                                collection,
                                entity: usedEntity,
                                modifiedValues: modifiedValues ?? usedEntity?.values
                            })}
                        </ErrorBoundary>
                    </Box>
                );
            }
        );

        const loading = (dataLoading && !usedEntity) || ((!usedEntity || readOnly === undefined) && (status === "existing" || status === "copy"));

        const subCollectionsViews = subcollections && subcollections.map(
            (subcollection, colIndex) => {
                const fullPath = usedEntity ? `${path}/${usedEntity?.id}/${removeInitialAndTrailingSlashes(subcollection.alias ?? subcollection.path)}` : undefined;

                return (
                    <Box
                        sx={{
                            width: ADDITIONAL_TAB_WIDTH,
                            height: "100%",
                            overflow: "auto",
                            borderLeft: `1px solid ${theme.palette.divider}`,
                            [theme.breakpoints.down("lg")]: {
                                borderLeft: "inherit",
                                width: CONTAINER_FULL_WIDTH
                            }
                        }}
                        key={`subcol_${subcollection.name}_${colIndex}`}
                        role="tabpanel"
                        flexGrow={1}
                        hidden={tabsPosition !== colIndex + customViewsCount}>

                        {loading && <CircularProgressCenter/>}

                        {!loading &&
                            (usedEntity && fullPath
                                ? <EntityCollectionView
                                    fullPath={fullPath}
                                    isSubCollection={true}
                                    {...subcollection}/>
                                : <Box
                                    sx={{
                                        width: "100%",
                                        height: "100%",
                                        p: 3
                                    }}
                                    display={"flex"}
                                    alignItems={"center"}
                                    justifyContent={"center"}>
                                    <Typography variant={"label"}>
                                        You need to save your entity before
                                        adding additional collections
                                    </Typography>
                                </Box>)
                        }

                    </Box>
                );
            }
        );

        const getSelectedSubPath = useCallback((value: number) => {
            if (value === -1) return undefined;

            if (customViews && value < customViewsCount) {
                return customViews[value].path;
            }

            if (subcollections) {
                return subcollections[value - customViewsCount].path;
            }

            throw Error("Something is wrong in getSelectedSubPath");
        }, [customViews, customViewsCount, subcollections]);

        const onDiscard = useCallback(() => {
            onValuesAreModified(false);
        }, []);

        const onSideTabClick = useCallback((value: number) => {
            setTabsPosition(value);
            if (entityId) {
                sideEntityController.replace({
                    path,
                    entityId,
                    selectedSubPath: getSelectedSubPath(value),
                    updateUrl: true
                });
            }
        }, [entityId, sideEntityController, path, getSelectedSubPath]);

        const onValuesChanged = useCallback((values?: EntityValues<M>) => {
            modifiedValuesRef.current = values;
        }, []);

        const form = (readOnly === undefined)
            ? null
            : (!readOnly
                ? (
                    <EntityForm
                        key={`form_${path}_${usedEntity?.id ?? "new"}`}
                        status={status}
                        path={path}
                        collection={collection}
                        onEntitySave={onEntitySave}
                        onDiscard={onDiscard}
                        onValuesChanged={onValuesChanged}
                        onModified={onValuesAreModified}
                        entity={usedEntity}
                    />
                )
                : (
                    <EntityPreview
                        entity={usedEntity as Entity<M>}
                        path={path}
                        collection={collection}/>
                ));

        const subcollectionTabs = subcollections && subcollections.map(
            (subcollection) =>
                <Tab
                    sx={{
                        fontSize: "0.875rem",
                        minWidth: "140px"
                    }}
                    wrapped={true}
                    key={`entity_detail_collection_tab_${subcollection.name}`}
                    label={subcollection.name}/>
        );

        const customViewTabs = customViews && customViews.map(
            (view) =>
                <Tab
                    sx={{
                        fontSize: "0.875rem",
                        minWidth: "140px"
                    }}
                    wrapped={true}
                    key={`entity_detail_custom_tab_${view.name}`}
                    label={view.name}/>
        );

        const header = (
            <Box sx={{
                paddingLeft: 2,
                paddingRight: 2,
                paddingTop: 1,
                display: "flex",
                alignItems: "end",
                backgroundColor: theme.palette.mode === "light" ? theme.palette.background.default : theme.palette.background.paper
            }}>

                <Box
                    sx={{
                        pb: 1,
                        alignSelf: "center"
                    }}>
                    <IconButton onClick={() => {
                        onClose?.();
                        return sideDialogContext.close(false);
                    }}
                                size="large">
                        <CloseIcon/>
                    </IconButton>
                </Box>

                <Box flexGrow={1}/>

                {loading && <Box
                    sx={{
                        alignSelf: "center"
                    }}>
                    <CircularProgress size={16} thickness={8}/>
                </Box>}

                <Tabs
                    value={tabsPosition + 1}
                    indicatorColor="secondary"
                    textColor="inherit"
                    onChange={(ev, value) => {
                        onSideTabClick(value - 1);
                    }}
                    sx={{
                        paddingLeft: theme.spacing(1),
                        paddingRight: theme.spacing(1),
                        paddingTop: theme.spacing(0)
                    }}
                    variant="scrollable"
                    scrollButtons="auto"
                >
                    <Tab
                        label={collection.singularName ?? collection.name}
                        disabled={largeLayout || !hasAdditionalViews}
                        sx={{
                            display: largeLayout ? "none" : undefined,
                            fontSize: "0.875rem",
                            minWidth: "140px"
                        }}
                        wrapped={true}
                    />
                    {customViewTabs}
                    {subcollectionTabs}

                </Tabs>
            </Box>

        );

        return (
            <Box
                sx={{
                    display: "flex",
                    flexDirection: "column",
                    height: "100%",
                    width: "100%",
                    transition: "width 250ms ease-in-out"
                }}>
                {
                    <>

                        {header}

                        <Divider/>

                        <Box sx={{
                            flexGrow: 1,
                            height: "100%",
                            width: `calc(${ADDITIONAL_TAB_WIDTH} + ${resolvedFormWidth})`,
                            maxWidth: "100%",
                            [theme.breakpoints.down("sm")]: {
                                width: CONTAINER_FULL_WIDTH
                            },
                            display: "flex",
                            overflow: "auto",
                            flexDirection: "row"
                        }}>

                            <Box sx={{
                                position: "relative"
                            }}>
                                <Box
                                    role="tabpanel"
                                    hidden={!mainViewVisible}
                                    sx={{
                                        width: resolvedFormWidth,
                                        maxWidth: "100%",
                                        height: "100%",
                                        overflow: "auto",
                                        [theme.breakpoints.down("sm")]: {
                                            maxWidth: CONTAINER_FULL_WIDTH,
                                            width: CONTAINER_FULL_WIDTH
                                        }
                                    }}>

                                    <Box
                                        sx={(theme) => ({
                                            width: "100%",
                                            marginTop: theme.spacing(3),
                                            paddingLeft: theme.spacing(4),
                                            paddingRight: theme.spacing(4),
                                            paddingTop: theme.spacing(3),
                                            [theme.breakpoints.down("lg")]: {
                                                marginTop: theme.spacing(2),
                                                paddingLeft: theme.spacing(2),
                                                paddingRight: theme.spacing(2),
                                                paddingTop: theme.spacing(2)
                                            },
                                            [theme.breakpoints.down("md")]: {
                                                marginTop: theme.spacing(1),
                                                paddingLeft: theme.spacing(2),
                                                paddingRight: theme.spacing(2),
                                                paddingTop: theme.spacing(2)
                                            }
                                        })}>

                                        <Typography
                                            sx={{
                                                marginTop: 4,
                                                marginBottom: 4
                                            }}
                                            variant={"h4"}>{collection.singularName ?? collection.name + " entry"}
                                        </Typography>

                                    </Box>

                                    {loading
                                        ? <CircularProgressCenter/>
                                        : form}

                                </Box>
                            </Box>

                            {customViewsView}

                            {subCollectionsViews}

                        </Box>

                    </>
                }

            </Box>
        );
    },
    equal
)
