import {
    EntityCollection,
    PropertiesOrBuilders,
    PropertyOrBuilder,
    ResolvedEntityCollection
} from "../../types";
import { mergeDeep } from "./objects";
import { isPropertyBuilder } from "./entities";

/**
 *
 * @param target
 * @param source
 */
export function mergeCollections(target: EntityCollection, source: EntityCollection): EntityCollection {
    const subcollectionsMerged = target.subcollections?.map((targetSubcollection) => {
        const modifiedCollection =
            source.subcollections?.find((sourceSubcollection) => sourceSubcollection.path === targetSubcollection.path) ??
            source.subcollections?.find((sourceSubcollection) => sourceSubcollection.alias === targetSubcollection.alias);

        if (!modifiedCollection) {
            return targetSubcollection;
        } else {
            return mergeCollections(targetSubcollection, modifiedCollection);
        }
    });

    const mergedCollection = mergeDeep(target, source);
    return {
        ...mergedCollection,
        subcollections: subcollectionsMerged,
        properties: sortProperties(mergedCollection.properties, mergedCollection.propertiesOrder)
    }
}

/**
 *
 * @param fetchedCollections
 * @param baseCollections
 */
export function joinCollectionLists(fetchedCollections: EntityCollection[], baseCollections: EntityCollection[] | undefined): EntityCollection[] {
    const resolvedFetchedCollections: EntityCollection[] = fetchedCollections.map(c => ({
        ...c,
        editable: true,
        deletable: true
    }));
    const updatedCollections = (baseCollections ?? [])
        .map((navigationCollection) => {
            const storedCollection = resolvedFetchedCollections?.find((collection) => collection.path === navigationCollection.path) ??
                resolvedFetchedCollections?.find((collection) => collection.alias === navigationCollection.alias);
            if (!storedCollection) {
                return { ...navigationCollection, deletable: false };
            } else {
                const mergedCollection = mergeCollections(navigationCollection, storedCollection);
                return { ...mergedCollection, deletable: false };
            }
        });
    const storedCollections = resolvedFetchedCollections
        .filter((col) => !updatedCollections.map(c => c.path).includes(col.path) || !updatedCollections.map(c => c.alias).includes(col.alias));

    return [...updatedCollections, ...storedCollections];
}

export function sortProperties<M extends Record<string, any>>(properties: PropertiesOrBuilders<M>, propertiesOrder?: (keyof M)[]): PropertiesOrBuilders<M> {
    try {
        const propertiesKeys = Object.keys(properties);
        const allPropertiesOrder = propertiesOrder ?? propertiesKeys;
        return allPropertiesOrder
            .map((key) => {
                if (properties[key as keyof M]) {
                    const property = properties[key] as PropertyOrBuilder;
                    if (!isPropertyBuilder(property) && property?.dataType === "map" && property.properties) {
                        return ({
                            [key]: {
                                ...property,
                                properties: sortProperties(property.properties, property.propertiesOrder)
                            }
                        });
                    } else {
                        return ({ [key]: property });
                    }
                } else {
                    return undefined;
                }
            })
            .filter((a) => a !== undefined)
            .reduce((a: any, b: any) => ({ ...a, ...b }), {}) as PropertiesOrBuilders<M>;
    } catch (e) {
        console.error("Error sorting properties", e);
        return properties;
    }
}

export function getFistAdditionalView<M extends Record<string, any>>(collection: EntityCollection<M> | ResolvedEntityCollection<M>) {
    const subcollections = collection.subcollections;
    const subcollectionsCount = subcollections?.length ?? 0;
    const customViews = collection.views;
    const customViewsCount = customViews?.length ?? 0;
    const hasAdditionalViews = customViewsCount > 0 || subcollectionsCount > 0;
    return !hasAdditionalViews ? undefined : (customViews && customViews?.length > 0 ? customViews[0] : (subcollections && subcollections?.length > 0 ? subcollections[0] : undefined));
}
