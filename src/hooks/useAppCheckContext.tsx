import { NavigationContext } from "../types";
import { useContext } from "react";
import { AppCheck } from "firebase/app-check";
import { AppCheckContext } from "../core/contexts/AppCheckContext";

/**
 * Use this hook to get the navigation of the app.
 * This controller provides the resolved collections for the CMS as well
 * as utility methods.
 *
 * @category Hooks and utilities
 */
export const useAppCheckContext = (): AppCheck => useContext(AppCheckContext);
