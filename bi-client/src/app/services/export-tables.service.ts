import { Injectable } from '@angular/core';
import * as FileSaver from 'file-saver';
import csv from 'csvtojson';

@Injectable({
  providedIn: 'root'
})
export class ExportTablesService {
  async localCsvToJson(csvText: string) {
    return new Promise(resolve => {
      const list: Wscols[] = [];
      let array: string[][] = [];
      csv({
        noheader: true,
        output: 'csv'
      })
        .fromString(csvText)
        .then((data: string[][]) => {
          array = data;
          array.forEach((row: string[], i: number) => {
            if (i == 0) return;
            const obj: Wscols = {} as Wscols;
            row.forEach((col: string, j: number) => {
              obj[array[0][j]] = array[i][j];
            });
            list.push(obj);
          });
          resolve(list);
        });
    });
  }

  async exportExcel(csvText: string, fileName: string, wscols?: Wscols[]): Promise<void> {
    return new Promise((resolve, reject) => {
      this.localCsvToJson(csvText).then(list => {
        console.log(list);

        import('xlsx').then(
          xlsx => {
            const worksheet = xlsx.utils.json_to_sheet(list as Wscols[], {
              skipHeader: Boolean(wscols?.length)
            });
            if (wscols) worksheet['!cols'] = wscols;
            const workbook = {
              Sheets: { data: worksheet },
              SheetNames: ['data']
            };
            const excelBuffer: ArrayBuffer = xlsx.write(workbook, {
              bookType: 'xlsx',
              type: 'array'
            });

            console.log(excelBuffer);

            this.saveAsExcelFile(excelBuffer, fileName);
            resolve();
          },
          err => {
            reject(new Error(err));
          }
        );
      });
    });
  }

  private saveAsExcelFile(buffer: ArrayBuffer, fileName: string): Promise<void> {
    return new Promise(resolve => {
      const EXCEL_TYPE =
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
      const EXCEL_EXTENSION = '.xlsx';
      const data: Blob = new Blob([buffer], {
        type: EXCEL_TYPE
      });
      FileSaver.saveAs(data, fileName + EXCEL_EXTENSION);
      resolve();
    });
  }
}

interface Wscols {
  [key: string]: string;
  // Aquí van las otras propiedades de Wscols
}
