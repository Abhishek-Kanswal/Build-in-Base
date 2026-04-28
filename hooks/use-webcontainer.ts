"use client";

import { WebContainer } from "@webcontainer/api";
import { useEffect, useState } from "react";

let webcontainerInstance: WebContainer | null = null;
let bootPromise: Promise<WebContainer> | null = null;

export function useWebContainer() {
  const [webcontainer, setWebcontainer] = useState<WebContainer | null>(webcontainerInstance);
  const [isBooting, setIsBooting] = useState(!webcontainerInstance);

  useEffect(() => {
    if (webcontainerInstance) {
      setWebcontainer(webcontainerInstance);
      setIsBooting(false);
      return;
    }

    const startBoot = async () => {
      setIsBooting(true);
      try {
        if (!bootPromise) {
          bootPromise = WebContainer.boot();
        }
        webcontainerInstance = await bootPromise;
        setWebcontainer(webcontainerInstance);
      } catch (error) {
        console.error("Failed to boot WebContainer", error);
      } finally {
        setIsBooting(false);
      }
    };

    startBoot();
  }, []);

  return { webcontainer, isBooting };
}
