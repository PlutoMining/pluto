import { RefObject } from "react";

const waitForElement = (
  iframeDocument: Document,
  selector: string,
  timeout: number
): Promise<HTMLElement | null> => {
  return new Promise((resolve) => {
    const startTime = Date.now();

    const interval = setInterval(() => {
      const element = iframeDocument.querySelector(selector) as HTMLElement;

      if (element && element.style.visibility !== "hidden") {
        clearInterval(interval);
        resolve(element);
      } else if (Date.now() - startTime > timeout) {
        clearInterval(interval);
        resolve(null); // Timeout: elemento non trovato
      }
    }, 100); // Intervallo di 100ms
  });
};

export const restyleIframe =
  (iframeRef: RefObject<HTMLIFrameElement>, frameBgColor: string) => async () => {
    const iframeDocument = iframeRef.current?.contentDocument;
    if (iframeDocument) {
      // Modifica colore di sfondo del body
      iframeDocument.body.style.backgroundColor = frameBgColor;

      // Aspetta fino a 2 secondi per il page-toolbar > :first child
      const firstChild = await waitForElement(iframeDocument, ".page-toolbar > :first-child", 2000);
      if (firstChild) {
        firstChild.style.visibility = "hidden";
        firstChild.style.backgroundColor = frameBgColor;
      }

      // Aspetta fino a 2 secondi per il footer link
      const footerLink = await waitForElement(
        iframeDocument,
        '[data-testid="public-dashboard-footer"] a',
        2000
      );
      if (footerLink) {
        // footerLink.style.visibility = "hidden";
        footerLink.style.backgroundColor = frameBgColor;
      }

      // Modifica background color di page-toolbar e footer principale
      const pageToolbar = iframeDocument.querySelector(".page-toolbar") as HTMLElement;
      if (pageToolbar) {
        pageToolbar.style.backgroundColor = frameBgColor;
      }

      const dashboardFooter = iframeDocument.querySelector(
        '[data-testid="public-dashboard-footer"]'
      ) as HTMLElement;
      if (dashboardFooter) {
        dashboardFooter.style.backgroundColor = frameBgColor;
      }
    }
  };
