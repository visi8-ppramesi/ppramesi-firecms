import React from "react";
import { AppCheck } from "firebase/app-check"

export const AppCheckContext = React.createContext<AppCheck>({} as AppCheck);
