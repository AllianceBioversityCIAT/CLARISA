import { Component, OnInit } from '@angular/core';
import { ManageApiService } from '../../../../services/manage-api.service';

/** Una sección de la pantalla. El permiso decide si se muestra. */
interface PartnerTab {
  id: 'list' | 'new' | 'pending' | 'bulk';
  label: string;
  /** Endpoints que el usuario necesita poder llamar para que la sección tenga sentido. */
  requires: string[];
}

@Component({
  selector: 'app-content-partner',
  templateUrl: './content-partner.component.html',
  styleUrls: ['./content-partner.component.scss']
})
export class ContentPartnerComponent implements OnInit {
  informationParnertRequest: any;
  p: number = 1;
  miStorage: any;
  statusProcess: boolean;
  menssageConfirmProcess: string;

  /**
   * Qué pestaña se está viendo. Antes lo llevaba el JavaScript de Bootstrap a
   * través de `data-bs-toggle="tab"` y de los `href="#tab25"`; ahora es estado
   * de Angular, que es lo que permite pintar el activo y el contador sin
   * depender del tema.
   */
  activeTab: PartnerTab['id'] = 'list';

  private readonly tabs: PartnerTab[] = [
    { id: 'list', label: 'List', requires: [] },
    { id: 'new', label: 'Request new institution', requires: ['/api/partner-requests/create'] },
    { id: 'pending', label: 'Pending requests', requires: ['/api/partner-requests/update', '/api/partner-requests/respond'] },
    { id: 'bulk', label: 'Bulk request', requires: ['/api/partner-requests/create-bulk'] }
  ];

  constructor(private _manageApiService: ManageApiService) {}

  ngOnInit(): void {
    this.miStorage = window.localStorage.getItem('user');

    this.miStorage = JSON.parse(this.miStorage);
    this._manageApiService.getAllPartnerRequest().subscribe((resp) => {
      this.informationParnertRequest = resp;
    });
  }

  /** Las secciones que este usuario puede abrir, en orden. */
  get visibleTabs(): PartnerTab[] {
    const permissions: string[] = this.miStorage?.permissions ?? [];
    return this.tabs.filter((tab) => tab.requires.every((permission) => permissions.indexOf(permission) !== -1));
  }

  /**
   * Cuántas solicitudes esperan revisión. `?? 0` porque mientras la petición
   * está en vuelo —o cuando responde 401— la propiedad no existe todavía.
   */
  get pendingCount(): number {
    return this.informationParnertRequest?.length ?? 0;
  }

  partnerResolve(value: any) {
    if (value.status != 'Edited') {
      this.informationParnertRequest.splice(value.id, 1);
      this.statusProcess = true;
      this.menssageConfirmProcess =
        'The partner ' + value.status + ' process has been successful. An email should be sent shortly notifying the user.';
    } else {
      this.informationParnertRequest[value.id] = value.partnerInfoNew;
    }
  }

  indexList(page: number, num: number) {
    return num + (page - 1) * 10;
  }
}
