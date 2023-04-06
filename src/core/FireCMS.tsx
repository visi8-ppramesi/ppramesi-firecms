import React from "react";

import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import DateFnsUtils from "@date-io/date-fns";
import * as locales from "date-fns/locale";

import { FireCMSContext, FireCMSPlugin, FireCMSProps, User } from "../types";
import { BreadcrumbsProvider } from "./contexts/BreacrumbsContext";
import { ModeControllerContext } from "./contexts/ModeController";
import {
    useBuildSideEntityController
} from "./internal/useBuildSideEntityController";
import {
    useBuildNavigationContext
} from "./internal/useBuildNavigationContext";
import {
    useBuildSideDialogsController
} from "./internal/useBuildSideDialogsController";
import {
    FireCMSContextInstance, useFireCMSContext,
    useModeController,
    useSnackbarController
} from "../hooks";
import { CenteredView, ErrorView } from "./components";
// import { StorageSourceContext } from "./contexts/StorageSourceContext";
// import { FirebaseAppContext } from "./contexts/FirebaseAppContext";
import {
    UserConfigurationPersistenceContext
} from "./contexts/UserConfigurationPersistenceContext";
// import { DataSourceContext } from "./contexts/DataSourceContext";
import {
    SideEntityControllerContext
} from "./contexts/SideEntityControllerContext";
import { NavigationContextInstance } from "./contexts/NavigationContext";
// import { AuthControllerContext } from "./contexts/AuthControllerContext";
import {
    SideDialogsControllerContext
} from "./contexts/SideDialogsControllerContext";
import { useTraceUpdate } from "./util/useTraceUpdate";
import { AppCheckContext } from "./contexts/AppCheckContext";

const DEFAULT_COLLECTION_PATH = "/c";

/**
 * If you are using independent components of the CMS
 * you need to wrap them with this main component, so the internal hooks work.
 *
 * @constructor
 * @category Core
 */

export function FireCMS<UserType extends User>(props: FireCMSProps<UserType>) {

    const modeController = useModeController();
    const {
        firebaseApp,
        children,
        collections,
        views,
        entityLinkBuilder,
        userConfigPersistence,
        dateTimeFormat,
        locale,
        authController,
        collectionOverrideHandler,
        storageSource,
        dataSource,
        basePath,
        baseCollectionPath,
        plugins,
        onAnalyticsEvent,
        fields,
        appCheck
    } = props;

    const usedBasePath = basePath ?? "/";
    const usedBasedCollectionPath = baseCollectionPath ?? DEFAULT_COLLECTION_PATH;

    const dateUtilsLocale = locale ? locales[locale] : undefined;

    const navigation = useBuildNavigationContext({
        basePath: usedBasePath,
        baseCollectionPath: usedBasedCollectionPath,
        authController,
        collections,
        views,
        collectionOverrideHandler,
        userConfigPersistence,
        dataSource,
        plugins
    });

    const sideDialogsController = useBuildSideDialogsController();
    const sideEntityController = useBuildSideEntityController(navigation, sideDialogsController);

    const snackbarController = useSnackbarController();

    const loading = authController.initialLoading || navigation.loading || (plugins?.some(p => p.loading) ?? false);

    if (navigation.navigationLoadingError) {
        return (
            <CenteredView maxWidth={300} fullScreen={true}>
                <ErrorView
                    title={"Error loading navigation"}
                    error={navigation.navigationLoadingError}/>
            </CenteredView>
        );
    }

    if (authController.authError) {
        return (
            <CenteredView maxWidth={300} fullScreen={true}>
                <ErrorView
                    title={"Error loading auth"}
                    error={authController.authError}/>
            </CenteredView>
        );
    }

    const context: Partial<FireCMSContext> = {
        // authController,
        // sideDialogsController,
        // sideEntityController,
        // navigation,
        // dataSource,
        // storageSource,
        // snackbarController,
        // userConfigPersistence,
        entityLinkBuilder,
        dateTimeFormat,
        locale,
        plugins,
        onAnalyticsEvent,
        fields
    };

    return (
        <ModeControllerContext.Provider value={modeController}>
            
            <FireCMSContextInstance.Provider value={context}>
                {/* <FirebaseAppContext.Provider
                    value={firebaseApp}> */}
                    <UserConfigurationPersistenceContext.Provider
                        value={userConfigPersistence}>
                        {/* <StorageSourceContext.Provider
                            value={storageSource}> */}
                            {/* <DataSourceContext.Provider
                                value={dataSource}> */}
                                {/* <AuthControllerContext.Provider
                                    value={authController}> */}
                                    <SideDialogsControllerContext.Provider
                                        value={sideDialogsController}>
                                        <SideEntityControllerContext.Provider
                                            value={sideEntityController}>
                                            <NavigationContextInstance.Provider
                                                value={navigation}>
                                                {appCheck ? 
                                                    <AppCheckContext.Provider
                                                        value={appCheck}>
                                                        <BreadcrumbsProvider>
                                                            <LocalizationProvider
                                                                dateAdapter={AdapterDateFns}
                                                                utils={DateFnsUtils}
                                                                locale={dateUtilsLocale}>
                                                                <FireCMSInternal
                                                                    loading={loading}>
                                                                    {children}
                                                                </FireCMSInternal>
                                                            </LocalizationProvider>
                                                        </BreadcrumbsProvider>
                                                    </AppCheckContext.Provider> :
                                                    <BreadcrumbsProvider>
                                                        <LocalizationProvider
                                                            dateAdapter={AdapterDateFns}
                                                            utils={DateFnsUtils}
                                                            locale={dateUtilsLocale}>
                                                            <FireCMSInternal
                                                                loading={loading}>
                                                                {children}
                                                            </FireCMSInternal>
                                                        </LocalizationProvider>
                                                    </BreadcrumbsProvider>
                                                }
                                            </NavigationContextInstance.Provider>
                                        </SideEntityControllerContext.Provider>
                                    </SideDialogsControllerContext.Provider>
                                {/* </AuthControllerContext.Provider> */}
                            {/* </DataSourceContext.Provider> */}
                        {/* </StorageSourceContext.Provider> */}
                    </UserConfigurationPersistenceContext.Provider>
                {/* </FirebaseAppContext.Provider> */}
            </FireCMSContextInstance.Provider>
        </ModeControllerContext.Provider>
    );
}

function FireCMSInternal({
                             loading,
                             children
                         }: {
    loading: boolean;
    children: (props: {
        context: FireCMSContext;
        loading: boolean;
    }) => React.ReactNode;
}) {

    const context = useFireCMSContext();
    let childrenResult = children({
        context,
        loading
    });

    const plugins = context.plugins;
    if (!loading && plugins) {
        plugins.forEach((plugin: FireCMSPlugin) => {
            if (plugin.wrapperComponent) {
                childrenResult = (
                    <plugin.wrapperComponent.Component {...plugin.wrapperComponent.props}
                                                       context={context}>
                        {childrenResult}
                    </plugin.wrapperComponent.Component>
                );
            }
        });
    }

    return <>{childrenResult}</>;
}
