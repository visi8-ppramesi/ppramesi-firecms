import React, { useCallback } from "react";
import { FieldProps, Properties, ResolvedProperties } from "../../types";
import {
    Box,
    FormControl,
    Grid,
    InputLabel,
    MenuItem,
    Select
} from "@mui/material";
import { SelectChangeEvent } from "@mui/material/Select";

import { ExpandablePanel, isHidden, pick } from "../../core";
import { FieldDescription, LabelWithIcon } from "../components";
import { useClearRestoreValue } from "../../hooks";
import { PropertyFieldBinding } from "../PropertyFieldBinding";

/**
 * Field that renders the children property fields
 *
 * This is one of the internal components that get mapped natively inside forms
 * and tables to the specified properties.
 * @category Form fields
 */
export function MapFieldBinding<T extends Record<string, any>>({
                                                      propertyKey,
                                                      value,
                                                      showError,
                                                      disabled,
                                                      property,
                                                      setValue,
                                                      tableMode,
                                                      includeDescription,
                                                      underlyingValueHasChanged,
                                                      autoFocus,
                                                      shouldAlwaysRerender,
                                                      context
                                                  }: FieldProps<T>) {

    const pickOnlySomeKeys = property.pickOnlySomeKeys || false;
    const expanded = (property.expanded === undefined ? true : property.expanded) || autoFocus;

    if (!property.properties) {
        throw Error(`You need to specify a 'properties' prop (or specify a custom field) in your map property ${propertyKey}`);
    }

    let mapProperties: ResolvedProperties;
    if (!pickOnlySomeKeys) {
        mapProperties = property.properties;
    } else if (value) {
        mapProperties = pick(property.properties,
            ...Object.keys(value)
                .filter(key => key in property.properties!)
        );
    } else {
        mapProperties = {};
    }

    useClearRestoreValue({
        property,
        value,
        setValue
    });

    const buildPickKeysSelect = useCallback(() => {

        const keys = Object.keys(property.properties!)
            .filter((key) => !value || !(key in value));

        const handleAddProperty = (event: SelectChangeEvent) => {
            setValue({
                ...value,
                [event.target.value as string]: null
            });
        };

        if (!keys.length) return <></>;

        return <Box m={1}>
            <FormControl fullWidth>
                <InputLabel>Add property</InputLabel>
                <Select
                    variant={"standard"}
                    value={""}
                    disabled={disabled}
                    onChange={handleAddProperty}>
                    {keys.map((key) => (
                        <MenuItem key={key} value={key}>
                            {(property.properties as Properties)[key].name || key}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
        </Box>;
    }, [disabled, property.properties, setValue, value]);

    const mapFormView = <>
        <Grid container spacing={2}>
            {Object.entries(mapProperties)
                .filter(([_, property]) => !isHidden(property))
                .map(([entryKey, childProperty], index) => {
                        const fieldProps = {
                            propertyKey: `${propertyKey}.${entryKey}`,
                            disabled,
                            property: childProperty,
                            includeDescription,
                            underlyingValueHasChanged,
                            context,
                            tableMode: false,
                            partOfArray: false,
                            autoFocus: autoFocus && index === 0,
                            shouldAlwaysRerender: childProperty.fromBuilder
                        };
                        return (
                            <Grid item
                                  sm={12}
                                  xs={12}
                                  key={`map-${propertyKey}-${index}`}>
                                <PropertyFieldBinding {...fieldProps}/>
                            </Grid>
                        );
                    }
                )}
        </Grid>

        {pickOnlySomeKeys && buildPickKeysSelect()}

    </>;

    const title = <LabelWithIcon property={property}/>;

    return (
        <FormControl fullWidth error={showError}>

            {!tableMode && <ExpandablePanel expanded={expanded}
                                            title={title}>{mapFormView}</ExpandablePanel>}

            {tableMode && mapFormView}

            {includeDescription && <FieldDescription property={property}/>}

        </FormControl>
    );
}
