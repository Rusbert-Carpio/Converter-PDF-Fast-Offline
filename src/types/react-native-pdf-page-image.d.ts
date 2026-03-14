declare module "react-native-pdf-page-image" {
  export type PdfInfo = {
    uri: string;
    pageCount: number;
  };

  export type PageImage = {
    uri: string;
    width: number;
    height: number;
  };

  const PdfPageImage: {
    open(uri: string): Promise<PdfInfo>;
    generate(uri: string, page: number, scale?: number): Promise<PageImage>;
    generateAllPages(uri: string, scale?: number): Promise<PageImage[]>;
    close(uri: string): Promise<void>;
  };

  export default PdfPageImage;
}
