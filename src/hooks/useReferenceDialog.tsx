import { useSideDialogsController } from "./useSideDialogsController";
import { ReferenceDialogProps, ReferenceSelectionView } from "../core";
import { useCallback } from "react";
import { useNavigationContext } from "./useNavigationContext";

/**
 * This hook is used to open a side dialog that allows the selection
 * of entities under a given path.
 * You can use it in custom views for selecting entities.
 * You need to specify the path of the target collection at least.
 * If your collection is not defined in your  top collection configuration
 * (in your `FireCMS` component), you need to specify explicitly.
 * This is the same hook used internally when a reference property is defined.
 * @category Hooks and utilities
 */
export function useReferenceDialog<M extends Record<string, any>>(referenceDialogProps: Omit<ReferenceDialogProps<M>, "path"> & {
    path?: string | false;
}) {

    const navigation = useNavigationContext();
    const sideDialogsController = useSideDialogsController();

    const open = useCallback(() => {
        if (referenceDialogProps.path) {
            let usedCollection = referenceDialogProps.collection;
            if (!usedCollection)
                usedCollection = navigation.getCollection(referenceDialogProps.path);
            if (!usedCollection)
                throw Error("Not able to resolve the collection in useReferenceDialog");

            sideDialogsController.open({
                key: `reference_${referenceDialogProps.path}`,
                component:
                    <ReferenceSelectionView
                        {...referenceDialogProps as ReferenceDialogProps<M>}
                        collection={usedCollection}/>,
                width: "90vw"
            });
        } else {
            throw Error("useReferenceDialog: You are trying to open a reference dialog, but have not declared the `path`")
        }
    }, [navigation, referenceDialogProps, sideDialogsController]);

    const close = useCallback(() => {
        sideDialogsController.close();
    }, [sideDialogsController]);

    return {
        open,
        close
    }

}
