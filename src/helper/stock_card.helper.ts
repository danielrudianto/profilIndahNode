import pdfPrinter from 'pdfmake';

interface stockItem {
    name: string;
    date: Date;
    quantity: number;
    stock: number;
}

class StockCardHelper {
    static createPdf(data: any[]){
        const stockItems = (data as stockItem[]);
        const fontDescriptors = {
            Helvetica: {
                normal: 'Helvetica',
                bold: 'Helvetica-Bold',
                italics: 'Helvetica-Oblique',
                bolditalics: 'Helvetica-BoldOblique'
            },
        };
        const printer = new pdfPrinter(fontDescriptors);
        const stockBody: any[] = [];

        stockItems.forEach(x => {
          stockBody.push([x.date, x.name, x.quantity, x.stock])
        })
        const docDefinition = {
            content: [
              {
                layout: 'lightHorizontalLines', // optional
                table: {
                  headerRows: 1,
                  widths: [ 'auto', '*', '*', '*' ],
                  body: stockBody
                }
              }
            ]
          };
        
          const pdfDocument = printer.createPdfKitDocument(docDefinition);
          pdfDocument.pipe(createWriteStream('document.pdf'));
          pdfDocument.end();
    }

    static createCsv(data: any[]) {
      
    }
}

export default StockCardHelper;