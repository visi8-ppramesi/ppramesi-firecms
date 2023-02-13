import React from "react";
import { FirebaseApp } from "firebase/app"

export const FirebaseAppContext = React.createContext<FirebaseApp>({} as FirebaseApp);
