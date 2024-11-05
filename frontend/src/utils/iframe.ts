import { useToken } from "@chakra-ui/react";
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

const waitForElements = (
  iframeDocument: Document,
  selector: string,
  timeout: number
): Promise<NodeListOf<HTMLElement> | null> => {
  return new Promise((resolve) => {
    const startTime = Date.now();

    const interval = setInterval(() => {
      const elements = iframeDocument.querySelectorAll(selector) as NodeListOf<HTMLElement>;

      if (elements.length > 0) {
        clearInterval(interval);
        resolve(elements); // Restituisce tutti gli elementi trovati
      } else if (Date.now() - startTime > timeout) {
        clearInterval(interval);
        resolve(null); // Timeout: nessun elemento trovato
      }
    }, 100); // Intervallo di 100ms
  });
};

export const restyleIframe =
  (
    iframeRef: RefObject<HTMLIFrameElement>,
    frameBgColor: string,
    textColor: string,
    graphBgColor: string
  ) =>
  async () => {
    const iframeDocument = iframeRef.current?.contentDocument;

    const bodyFont = '"Azeret Mono", monospace';
    if (iframeDocument) {
      const style = iframeDocument.createElement("style");
      style.textContent = `

      @font-face {
        font-family: "Clash_Display";
        src: url("/fonts/ClashDisplay-Extralight.woff2") format("woff2"),
          url("/fonts/ClashDisplay-Extralight.woff") format("woff");
        font-weight: 100;
        font-style: normal;
      }

      @font-face {
        font-family: "Clash_Display";
        src: url("/fonts/ClashDisplay-Light.woff2") format("woff2"),
          url("/fonts/ClashDisplay-Light.woff") format("woff");
        font-weight: 200;
        font-style: normal;
      }

      @font-face {
        font-family: "Clash_Display";
        src: url("/fonts/ClashDisplay-Regular.woff2") format("woff2"),
          url("/fonts/ClashDisplay-Regular.woff") format("woff");
        font-weight: 400;
        font-style: normal;
      }

      @font-face {
        font-family: "Clash_Display";
        src: url("/fonts/ClashDisplay-Medium.woff2") format("woff2"),
          url("/fonts/ClashDisplay-Medium.woff") format("woff");
        font-weight: 500;
        font-style: normal;
      }

      @font-face {
        font-family: "Clash_Display";
        src: url("/fonts/ClashDisplay-Semibold.woff2") format("woff2"),
          url("/fonts/ClashDisplay-Semibold.woff") format("woff");
        font-weight: 700;
        font-style: normal;
      }

      @font-face {
        font-family: "Clash_Display";
        src: url("/fonts/ClashDisplay-Bold.woff2") format("woff2"),
          url("/fonts/ClashDisplay-Bold.woff") format("woff");
        font-weight: 800;
        font-style: normal;
      }
      html, body {
        font-family: "Azeret Mono", monospace;
        background-color: ${frameBgColor} !important;
      }
      h2 {
        font-family: "Clash_Display" !important;
        font-size: 32px !important;
        font-weight: 500 !important;
        line-height: 39.36px !important;
        text-align: left !important;
        color: ${textColor} !important;
      }
      `;
      iframeDocument.head.appendChild(style);

      // Aggiungi il font custom al <head> dell'iframe
      const link = iframeDocument.createElement("link");
      link.href = "https://fonts.googleapis.com/css2?family=Azeret+Mono:wght@400;700&display=swap";
      link.rel = "stylesheet";
      iframeDocument.head.appendChild(link);

      const nav = await waitForElement(iframeDocument, ".page-toolbar", 2000);
      if (nav) {
        nav.style.padding = "0px";
        nav.style.fontFamily = bodyFont;
      }

      const body = await waitForElement(
        iframeDocument,
        '[data-testid="public-dashboard-page"]',
        2000
      );

      if (body) {
        body.style.backgroundColor = frameBgColor;
        body.style.fontFamily = '"Azeret Mono", monospace !important'; // Applica a tutto il body

        const secondChild = body.children[1] as HTMLElement; // Seleziona il secondo figlio del body
        if (secondChild) {
          secondChild.style.padding = "0px"; // Modifica il padding del secondo figlio
        }
      }

      // Aspetta fino a 2 secondi per il page-toolbar > :first child
      const firstChild = await waitForElement(iframeDocument, ".page-toolbar > :first-child", 2000);
      if (firstChild) {
        firstChild.style.visibility = "hidden";
        firstChild.style.backgroundColor = frameBgColor;
        firstChild.style.padding = "0px";
      }

      // Aspetta fino a 2 secondi per il footer link
      const footerLink = await waitForElement(
        iframeDocument,
        '[data-testid="public-dashboard-footer"] a',
        2000
      );
      if (footerLink) {
        footerLink.style.visibility = "hidden";
        // footerLink.style.backgroundColor = frameBgColor;
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
