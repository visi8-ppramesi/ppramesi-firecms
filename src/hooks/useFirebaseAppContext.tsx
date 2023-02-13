import { NavigationContext } from "../types";
import { useContext } from "react";
import { FirebaseApp } from "firebase/app";
import { FirebaseAppContext } from "../core/contexts/FirebaseAppContext";

/**
 * Use this hook to get the navigation of the app.
 * This controller provides the resolved collections for the CMS as well
 * as utility methods.
 *
 * @category Hooks and utilities
 */
export const useFirebaseAppContext = (): FirebaseApp => useContext(FirebaseAppContext);