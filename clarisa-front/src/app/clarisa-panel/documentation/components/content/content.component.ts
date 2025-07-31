import { Component, Input, OnChanges, OnInit } from '@angular/core';
import { EndpointsInformationService } from '../../services/endpoints-information.service';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as FileSaver from 'file-saver';
import { environment } from '../../../../../environments/environment';
import { UrlParamsService } from 'src/app/clarisa-panel/services/url-params.service';

@Component({
  selector: 'app-content',
  templateUrl: './content.component.html',
  styleUrls: ['./content.component.scss']
})
export class ContentComponent implements OnInit, OnChanges {
  @Input() information: any = [];
  @Input() urlParams: any;
  arrayColumns = [];
  keysTable = [];
  responseJsonPrint: any;
  informationPrint: any;
  informationEndpoint: any;
  findColumns: string[] = [];
  first = 0;
  dialogVisible: boolean;
  rows = 10;
  loading: boolean = true;
  urlClarisa: string;
  showDynamicTableFilters: boolean = false;
  constructor(
    private _manageApiService: EndpointsInformationService,
    public _servicesUrl: UrlParamsService
  ) {}

  ngOnInit(): void {
    this.loading = true;
    this.urlClarisa = environment.apiUrl;
    console.clear();
    const { nameEndpoint } = this.urlParams;
    this.showDynamicTableFilters = nameEndpoint === 'CGIAR_entities';
    console.log(this.showDynamicTableFilters);
  }

  ngOnChanges() {
    this.loading = true;
    this.informationEndpoint = [];
    // Clear previous data when route changes
    this.interfaceStructure = null;
    this.formattedInterfaceJson = '';

    if (Object.keys(this.urlParams).length == 2) {
      this.handleTwoUrlParams();
    }
    if (Object.keys(this.urlParams).length == 3) {
      this.handleThreeUrlParams();
    }
  }

  private handleTwoUrlParams() {
    let variableAux = this._servicesUrl.paramsUrl.namesubcategory.split('_').join(' ');
    this.information.subcategories.find((x: any) => {
      if (variableAux != undefined) {
        if (x.name == variableAux) {
          this.informationPrint = x;
          // Generate fallback formatted JSON for subcategories
          this.generateFallbackFormattedJson();
        }
      }
    });
  }

  private handleThreeUrlParams() {
    let variableAux = this._servicesUrl.paramsUrl.namesubcategory.split('_').join(' ');
    let variableAuxi = this._servicesUrl.paramsUrl.nameEndpoint.split('_').join(' ');
    this.information.subcategories.find((x: any) => {
      if (variableAux != undefined) {
        if (x.name == variableAux) {
          this.informationPrint = x;
        }
      }
    });
    this.informationPrint.endpoints.find((x: any) => {
      if (variableAux != undefined) {
        if (x.name == variableAuxi) {
          this.informationPrint = x;
        }
      }
    });
    this._manageApiService.getAnyEndpoint(this.informationPrint.route).subscribe(resp => {
      this.informationEndpoint = resp;
      this.loading = false;
    });
  }

  iniciativeEndInformation() {
    let auxVariable = this.informationPrint.response_json;
    this.arrayColumns = this.columnsTable(auxVariable.properties);

    this.arrayColumns = this.arrayColumns.filter(x => x);

    this.findColumns = [];
    for (let i of this.arrayColumns) {
      this.findColumns.push(i[1]);
    }

    return this.arrayColumns;
  }

  returnResponseJson() {
    // Si ya tenemos la estructura de interfaz, la mostramos
    if (this.interfaceStructure) {
      return JSON.stringify(this.interfaceStructure, null, 4);
    }

    // Si no, generamos la estructura de interfaz a partir de la información del endpoint
    let auxVariable = this.informationPrint.response_json;
    this.responseJsonPrint = this.jsonResponse(auxVariable.properties, auxVariable.object_type);

    console.log(JSON.stringify(this.responseJsonPrint, null, 4));
    console.log(this.interfaceStructure);
    return JSON.stringify(this.responseJsonPrint, null, 4);
  }

  //In this function we organize the response in json type.
  jsonResponse(jsonStr, typeJson) {
    let responseJson;
    let auxList = jsonStr;

    if (typeJson == 'list') {
      responseJson = [{}];
    }
    if (typeJson == 'object') {
      responseJson = {};
    }

    for (let i in auxList) {
      if (Array.isArray(responseJson)) {
        this.processArrayResponse(responseJson, auxList, i);
      } else if (typeof responseJson == 'object') {
        this.processObjectResponse(responseJson, auxList, i);
      }
    }

    return responseJson;
  }

  processArrayResponse(responseJson, auxList, i) {
    if (auxList[i].object_type == 'field') {
      responseJson[0][i] = auxList[i].type;
    }
    if (auxList[i].object_type == 'object') {
      responseJson[0][i] = this.jsonResponse(auxList[i].properties, auxList[i].object_type);
    }
    if (auxList[i].object_type == 'list') {
      responseJson[0][i] = this.jsonResponse(auxList[i].properties, auxList[i].object_type);
    }
  }

  processObjectResponse(responseJson, auxList, i) {
    if (auxList[i].object_type == 'field') {
      responseJson[i] = auxList[i].type;
    }
    if (auxList[i].object_type == 'object') {
      responseJson[i] = this.jsonResponse(auxList[i].properties, auxList[i].object_type);
    }
    if (auxList[i].object_type == 'list') {
      responseJson[0][i] = this.jsonResponse(auxList[i].properties, auxList[i].object_type);
    }
  }

  columnsTable(listaAux) {
    let endpointJsonOnes = listaAux;
    let columns = [];

    for (let i in endpointJsonOnes) {
      if (endpointJsonOnes[i].show_in_table && endpointJsonOnes[i].object_type != 'object' && endpointJsonOnes[i].object_type != 'list') {
        columns[endpointJsonOnes[i].order] = [endpointJsonOnes[i].column_name, i, endpointJsonOnes[i].object_type];
      }
      if (endpointJsonOnes[i].object_type == 'object') {
        if (endpointJsonOnes[i].show_in_table) {
          columns[order] = [endpointJsonOnes[i].column_name, i, endpointJsonOnes[i].object_type, this.columnsTable(endpointJsonOnes[i].properties)];
        }
      }
      if (endpointJsonOnes[i].object_type == 'list') {
        if (endpointJsonOnes[i].show_in_table) {
          columns[order] = [endpointJsonOnes[i].column_name, i, endpointJsonOnes[i].object_type, this.columnsTable(endpointJsonOnes[i].properties)];
        }
      }
    }
    return columns.filter(Boolean); // Remove any undefined/null entries
  }

  exportPdf() {
    let d = new Date();
    let columns = [];
    let information = [];
    this.arrayColumns.forEach(x => {
      columns.push(x[0]);
    });
    for (let k of this.exportInformation()) {
      information.push(Object.values(k));
    }
    const doc = new jsPDF();
    autoTable(doc, {
      head: [columns],
      body: information,
      didDrawPage: dataArg => {
        doc.text(this.informationPrint.name, dataArg.settings.margin.left, 10);
      }
    });
    doc.save(
      'CLARISA_' + this.informationPrint.name + '_' + d.getFullYear() + (d.getMonth() + 1) + d.getDate() + d.getHours() + d.getMinutes() + '.pdf'
    );
  }

  exportExcel() {
    import('xlsx').then(xlsx => {
      const worksheet = xlsx.utils.json_to_sheet(this.exportInformation());
      const workbook = { Sheets: { data: worksheet }, SheetNames: ['data'] };
      const excelBuffer: any = xlsx.write(workbook, {
        bookType: 'xlsx',
        type: 'array'
      });
      this.saveAsExcelFile(excelBuffer, 'CLARISA_');
    });
  }

  saveAsExcelFile(buffer: any, fileName: string): void {
    let d = new Date();
    let EXCEL_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
    let EXCEL_EXTENSION = '.xlsx';
    const data: Blob = new Blob([buffer], {
      type: EXCEL_TYPE
    });
    FileSaver.saveAs(
      data,
      fileName +
        this.informationPrint.name +
        '_' +
        d.getFullYear() +
        (d.getMonth() + 1) +
        d.getDate() +
        d.getHours() +
        d.getMinutes() +
        EXCEL_EXTENSION
    );
  }

  exportInformation() {
    let exportInformation = [];
    for (let i of this.informationEndpoint) {
      const objectFormat = this.createObjectFormat(i);
      exportInformation.push(objectFormat);
    }
    return exportInformation;
  }

  createObjectFormat(i) {
    const objectFormat = {};
    for (let k of this.arrayColumns) {
      if (k[2] == 'field') {
        objectFormat[k[0]] = i[k[1]];
      }
      if (k[2] == 'object') {
        objectFormat[k[0]] = this.getObjectValue(i, k);
      }
      if (k[2] == 'list') {
        objectFormat[k[0]] = this.getListValue(i, k);
      }
    }
    return objectFormat;
  }

  getObjectValue(i, k) {
    let infoObject = '';
    if (i[k[1]] != null) {
      for (let j of k[3]) {
        if (j[0] != '' && j[0] != null) {
          infoObject = infoObject + k[0] + ' : ' + i[k[1]][j[1]] + '\n';
          return infoObject;
        }
        if (j[0] == '' || j[0] == null) {
          infoObject = infoObject + i[k[1]][j[1]] + '\n';
          return infoObject;
        }
      }
    }
    return infoObject;
  }

  getListValue(i, k) {
    let infoList = '';
    if (i[k[1]] != null) {
      if (k[3].length == 1) {
        for (let j of i[k[1]]) {
          infoList += j[k[3][0][1]] + ',' + '\n';
        }
        return infoList;
      }
      if (k[3].length != 1) {
        for (let j of i[k[1]]) {
          infoList += this.getListObjectValue(j, k[3]);
        }
        return infoList;
      }
    }
    return infoList;
  }

  getListObjectValue(j, properties) {
    let infoListObject = '';
    for (let p of properties) {
      if (p[0] != null && p[0] != '') {
        infoListObject = infoListObject + p[0] + ' : ' + j[p[1]] + '\n';
      }
      if (p[0] == null || p[0] == '') {
        infoListObject = infoListObject + j[p[1]] + '\n';
      }
    }
    return infoListObject;
  }

  showDialog() {
    this.dialogVisible = true;
  }

  closeDialog() {
    this.dialogVisible = false;
  }

  /**
   * Converts an array of objects to a TypeScript interface structure
   * @param data - Array of objects to analyze
   * @returns Object representing the interface structure with property types
   */
  convertArrayToInterface(data: any[]): any {
    if (!data || data.length === 0) {
      return {};
    }

    const interfaceStructure: any = {};

    // Analyze the first few objects to determine types (using up to 5 objects for better type inference)
    const sampleSize = Math.min(data.length, 5);

    for (let i = 0; i < sampleSize; i++) {
      const obj = data[i];
      if (obj && typeof obj === 'object') {
        Object.keys(obj).forEach(key => {
          const value = obj[key];
          const detectedType = this.detectTypeScriptType(value);

          // If we haven't seen this property before, set its type
          if (!interfaceStructure[key]) {
            interfaceStructure[key] = detectedType;
          }
          // If we've seen it before but with a different type, make it a union type
          else if (interfaceStructure[key] !== detectedType && !interfaceStructure[key].includes('|')) {
            interfaceStructure[key] = `${interfaceStructure[key]} | ${detectedType}`;
          }
        });
      }
    }

    return interfaceStructure;
  }

  /**
   * Detects the TypeScript type for a given value
   * @param value - The value to analyze
   * @returns String representing the TypeScript type
   */
  private detectTypeScriptType(value: any): string {
    if (value === null) {
      return 'null';
    }

    if (value === undefined) {
      return 'undefined';
    }

    const jsType = typeof value;

    switch (jsType) {
      case 'string':
        return 'string';
      case 'number':
        return 'number';
      case 'boolean':
        return 'boolean';
      case 'object':
        if (Array.isArray(value)) {
          if (value.length === 0) {
            return 'any[]';
          }
          // Analyze array elements to determine array type
          const elementType = this.detectTypeScriptType(value[0]);
          return `${elementType}[]`;
        } else {
          // For nested objects, return 'object' or could be expanded to analyze nested structure
          return 'object';
        }
      case 'function':
        return 'Function';
      default:
        return 'any';
    }
  }

  /**
   * Generates a formatted string representation of the interface
   * @param data - Array of objects to convert
   * @param interfaceName - Optional name for the interface
   * @returns Formatted string representing the TypeScript interface
   */
  generateInterfaceString(data: any[], interfaceName: string = 'DataInterface'): string {
    const interfaceStructure = this.convertArrayToInterface(data);

    let interfaceString = `export interface ${interfaceName} {\n`;

    Object.keys(interfaceStructure).forEach(key => {
      interfaceString += `  ${key}: ${interfaceStructure[key]};\n`;
    });

    interfaceString += '}';

    return interfaceString;
  }

  /**
   * Example method to test the interface conversion with current endpoint data
   */
  testInterfaceConversion(): void {
    if (this.informationEndpoint && this.informationEndpoint.length > 0) {
      const interfaceStructure = this.convertArrayToInterface(this.informationEndpoint);
      const interfaceString = this.generateInterfaceString(this.informationEndpoint, 'EndpointDataInterface');

      console.log('Interface Structure:', interfaceStructure);
      this.interfaceStructure = interfaceStructure;
      // Format JSON for template display
      this.formattedInterfaceJson = JSON.stringify(interfaceStructure, null, 4);
      console.log('Interface String:', interfaceString);
    }
  }

  /**
   * Generates fallback formatted JSON when there's no endpoint data
   */
  private generateFallbackFormattedJson(): void {
    if (this.informationPrint?.response_json) {
      let auxVariable = this.informationPrint.response_json;
      this.responseJsonPrint = this.jsonResponse(auxVariable.properties, auxVariable.object_type);
      this.formattedInterfaceJson = JSON.stringify(this.responseJsonPrint, null, 4);
    }
  }
}
