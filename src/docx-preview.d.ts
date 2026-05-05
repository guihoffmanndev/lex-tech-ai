declare module "docx-preview" {
  interface Options {
    className?: string;
    inWrapper?: boolean;
    ignoreWidth?: boolean;
    ignoreHeight?: boolean;
    ignoreFonts?: boolean;
    breakPages?: boolean;
    ignoreLastRenderedPageBreak?: boolean;
    experimental?: boolean;
    trimXmlDeclaration?: boolean;
    useBase64URL?: boolean;
    renderHeaders?: boolean;
    renderFooters?: boolean;
    renderFootnotes?: boolean;
    renderEndnotes?: boolean;
  }

  export function renderAsync(
    data: ArrayBuffer | Blob,
    bodyContainer: HTMLElement,
    styleContainer?: HTMLElement | null,
    options?: Options
  ): Promise<void>;
}
