export const endpointsInfo = [
  {
    id: 1,
    name: 'Annual Report API Reference',
    description: null,
    subcategories: [],
    endpoints: [],
  },
  {
    id: 2,
    name: 'One CGIAR Control List',
    description:
      'CLARISA provides standards in the form of control lists that can be used across platforms and systems to enable interoperability. These lists include the indicators defined in the Performance Results Management Framework of One CGIAR, currently being updated. In the panel on the left side, users can access different sections. ',
    subcategories: [
      {
        id: 5,
        name: 'General Control List',
        description:
          'The list of REST-API services below contains some of the most important general control lists identified by the Management Information Systems during the Annual Reporting process and that can also be used to standardize and provide interoperability across any other CGIAR platforms.',
        subcategories: [],
        endpoints: [
          {
            id: 1,
            name: 'CGIAR entities',
            description:
              'This list contains the official list of CGIAR Centers, CGIAR Research Programs (CRPs), and CGIAR Platforms (PTFs). It also includes the list of entities that are no longer active. Users can preview and export the list by clicking the ‘Display control list’ button below. ',
            route: 'api/cgiar-entities',
            http_method: 'GET',
            request_json: 'null',
            response_json:
              '{"type": "response", "order": null, "properties": {"code": {"type": "number", "order": 0, "properties": null, "column_name": "Code", "object_type": "field", "show_in_table": true}, "name": {"type": "string", "order": 1, "properties": null, "column_name": "Name", "object_type": "field", "show_in_table": true}, "acronym": {"type": "string", "order": 2, "properties": null, "column_name": "Acronym", "object_type": "field", "show_in_table": true}, "cgiarEntityTypeDTO": {"type": "cgiarEntityTypeDTO", "order": 3, "properties": {"code": {"type": "number", "order": 0, "properties": null, "column_name": "Code", "object_type": "field", "show_in_table": true}, "name": {"type": "string", "order": 1, "properties": null, "column_name": "Name", "object_type": "field", "show_in_table": true}}, "column_name": "CGIAR Entity type", "object_type": "object", "show_in_table": true}}, "column_name": null, "object_type": "list", "show_in_table": false}',
          },
          {
            id: 2,
            name: 'CGIAR entity Types',
            description:
              'This list provides the entity types of CGIAR Research Programs (CRPs), CGIAR Platforms (PTFs), CGIAR Centers, CGIAR Initiatives and One CGIAR Platform. Users can preview and export the list by clicking the ‘Display control list’ button below. ',
            route: 'api/cgiar-entity-types',
            http_method: 'GET',
            request_json: 'null',
            response_json:
              '{"type": "response", "order": null, "properties": {"code": {"type": "number", "order": 0, "properties": null, "column_name": "Code", "object_type": "field", "show_in_table": true}, "name": {"type": "string", "order": 1, "properties": null, "column_name": "Name", "object_type": "field", "show_in_table": true}}, "column_name": null, "object_type": "list", "show_in_table": false}',
          },
          {
            id: 3,
            name: 'Countries',
            description:
              'This list contains all the countries and follows the ISO-3166 standard. Data includes the country names in English, the ISO alpha-2 code and the associated Region according to the United Nations (UN) M49 standard. Users can preview and export the list by clicking the ‘Display control list’ button below. ',
            route: 'api/countries',
            http_method: 'GET',
            request_json: 'null',
            response_json:
              '{"type": "response", "order": null, "properties": {"code": {"type": "number", "order": 0, "properties": null, "column_name": "Code", "object_type": "field", "show_in_table": true}, "name": {"type": "string", "order": 2, "properties": null, "column_name": "Name", "object_type": "field", "show_in_table": true}, "isoAlpha2": {"type": "number", "order": 1, "properties": null, "column_name": "ISO Alpha2", "object_type": "field", "show_in_table": true}, "regionDTO": {"type": "regionDTO", "order": 3, "properties": {"name": {"type": "string", "order": 1, "properties": null, "column_name": "Name", "object_type": "field", "show_in_table": true}, "um49Code": {"type": "number", "order": 0, "properties": null, "column_name": "UN49 Code", "object_type": "field", "show_in_table": true}, "parentRegion": {"type": "parentRegion", "order": null, "properties": {"name": {"type": "string", "order": null, "properties": null, "column_name": null, "object_type": "field", "show_in_table": false}, "um49Code": {"type": "number", "order": null, "properties": null, "column_name": null, "object_type": "field", "show_in_table": false}}, "column_name": null, "object_type": "object", "show_in_table": false}}, "column_name": "Region", "object_type": "object", "show_in_table": true}}, "column_name": null, "object_type": "list", "show_in_table": false}',
          },
          {
            id: 4,
            name: 'UN Regions',
            description:
              'This list contains all the regions based on the United Nations (UN) M49 standard. Users can preview and export the list by clicking the ‘Display control list’ button below. ',
            route: 'api/un-regions',
            http_method: 'GET',
            request_json: 'null',
            response_json:
              '{"type": "response", "order": null, "properties": {"name": {"type": "string", "order": 1, "properties": null, "column_name": "Name", "object_type": "field", "show_in_table": true}, "um49Code": {"type": "number", "order": 0, "properties": null, "column_name": "UN49 Code", "object_type": "field", "show_in_table": true}, "parentRegion": {"type": "parentRegion", "order": null, "properties": {"name": {"type": "string", "order": null, "properties": null, "column_name": null, "object_type": "field", "show_in_table": false}, "um49Code": {"type": "number", "order": null, "properties": null, "column_name": null, "object_type": "field", "show_in_table": false}}, "column_name": null, "object_type": "object", "show_in_table": false}}, "column_name": null, "object_type": "list", "show_in_table": false}',
          },
          {
            id: 5,
            name: 'One CGIAR Regions',
            description:
              'This list contains groups of regions in which One CGIAR is concentrating its efforts, as stated in the One CGIAR Strategy. This includes Central and West Asia and North Africa, Latin America and the Caribbean, West and Central Africa, East and Southern Africa, South Asia, Southeast Asia and the Pacific. Users can preview and export the list by clicking the ‘Display control list’ button below. ',
            route: 'api/OneCGIARRegions',
            http_method: 'GET',
            request_json: 'null',
            response_json:
              '{"type": "response", "order": null, "properties": {"id": {"type": "number", "order": 0, "properties": null, "column_name": "Code", "object_type": "field", "show_in_table": true}, "name": {"type": "string", "order": 1, "properties": null, "column_name": "Name", "object_type": "field", "show_in_table": true}, "acronym": {"type": "string", "order": 2, "properties": null, "column_name": "Acronym", "object_type": "field", "show_in_table": true}, "countries": {"type": "cgiarEntityTypeDTO", "order": 3, "properties": {"code": {"type": "number", "order": null, "properties": null, "column_name": null, "object_type": "field", "show_in_table": false}, "name": {"type": "string", "order": null, "properties": null, "column_name": null, "object_type": "field", "show_in_table": false}, "isoAlpha2": {"type": "string", "order": 0, "properties": null, "column_name": null, "object_type": "field", "show_in_table": true}}, "column_name": "Countries", "object_type": "list", "show_in_table": true}}, "column_name": null, "object_type": "list", "show_in_table": false}',
          },
          {
            id: 6,
            name: 'CGIAR Acronyms',
            description:
              'This list contains acronyms of common use within One CGIAR. Users can preview and export the list by clicking the ‘Display control list’ button below. ',
            route: 'api/acronyms',
            http_method: 'GET',
            request_json: 'null',
            response_json:
              '{"type": "response", "order": null, "properties": {"code": {"type": "number", "order": 0, "properties": null, "column_name": "Code", "object_type": "field", "show_in_table": true}, "acronym": {"type": "string", "order": 1, "properties": null, "column_name": "Acronym", "object_type": "field", "show_in_table": true}, "description": {"type": "string", "order": 2, "properties": null, "column_name": "Description", "object_type": "field", "show_in_table": true}}, "column_name": null, "object_type": "list", "show_in_table": false}',
          },
          {
            id: 7,
            name: 'Glossary',
            description:
              'This list contains a glossary of terms extracted from the "Monitoring, Evaluation, Learning and Impact Assessment (MELIA) Glossary" prepared by the CGIAR Monitoring, Evaluation and Learning (MEL) Community of Practice (CoP) group in November 2021. Users can preview and export the list by clicking the ‘Display control list’ button below. ',
            route: 'api/glossary',
            http_method: 'GET',
            request_json: 'null',
            response_json:
              '{"type": "response", "order": null, "properties": {"term": {"type": "string", "order": 0, "properties": null, "column_name": "Term", "object_type": "field", "show_in_table": true}, "definition": {"type": "string", "order": 1, "properties": null, "column_name": "Definition", "object_type": "field", "show_in_table": true}}, "column_name": null, "object_type": "list", "show_in_table": false}',
          },
        ],
      },
      {
        id: 6,
        name: 'Institutions Control Lists',
        description:
          'This section contains lists of institutions that can serve not only One CGIAR but other stakeholders and strategic partners. The lists available are the Institutions List, the Institutions-related list and the Institution types. ',
        subcategories: [],
        endpoints: [
          {
            id: 8,
            name: 'Institutions',
            description:
              'This is a worldwide list of institutions related to CGIAR activity, leaders, partners, and contributors. This list reflects the information consolidated throughout the years from external sources and two main CGIAR Management Information Systems and external sources, namely Managing Agricultural Research for Learning and Outcomes (MARLO) and Monitoring, Evaluation and Learning (MEL). Users can preview and export the list by clicking the ‘Display control list’ button below. ',
            route: 'api/institutions',
            http_method: 'GET',
            request_json: 'null',
            response_json:
              '{"type": "response", "order": null, "properties": {"code": {"type": "number", "order": 0, "properties": null, "column_name": "Code", "object_type": "field", "show_in_table": true}, "name": {"type": "string", "order": 2, "properties": null, "column_name": "Name", "object_type": "field", "show_in_table": true}, "added": {"type": "date", "order": null, "properties": null, "column_name": null, "object_type": "field", "show_in_table": false}, "acronym": {"type": "string", "order": 1, "properties": null, "column_name": "Acronym", "object_type": "field", "show_in_table": true}, "websiteLink": {"type": "string", "order": 5, "properties": null, "column_name": "Website", "object_type": "field", "show_in_table": true}, "institutionType": {"type": "institutionType", "order": 3, "properties": {"code": {"type": "number", "order": null, "properties": null, "column_name": null, "object_type": "field", "show_in_table": false}, "name": {"type": "string", "order": 0, "properties": null, "column_name": null, "object_type": "field", "show_in_table": true}}, "column_name": "Insitution Type", "object_type": "object", "show_in_table": true}, "countryOfficeDTO": {"type": "countryOfficeDTO", "order": 4, "properties": {"code": {"type": "number", "order": null, "properties": null, "column_name": null, "object_type": "field", "show_in_table": false}, "name": {"type": "string", "order": null, "properties": null, "column_name": null, "object_type": "field", "show_in_table": false}, "isoAlpha2": {"type": "string", "order": 0, "properties": null, "column_name": null, "object_type": "field", "show_in_table": true}, "regionDTO": {"type": "regionDTO", "order": null, "properties": {"name": {"type": "string", "order": null, "properties": null, "column_name": null, "object_type": "field", "show_in_table": false}, "um49Code": {"type": "number", "order": null, "properties": null, "column_name": null, "object_type": "field", "show_in_table": false}, "parentRegion": {"type": "parentRegion", "order": null, "properties": {"name": {"type": "string", "order": null, "properties": null, "column_name": null, "object_type": "field", "show_in_table": false}, "um49Code": {"type": "number", "order": null, "properties": null, "column_name": null, "object_type": "field", "show_in_table": false}}, "column_name": null, "object_type": "object", "show_in_table": false}}, "column_name": null, "object_type": "object", "show_in_table": false}, "isHeadquarter": {"type": "boolean", "order": null, "properties": null, "column_name": null, "object_type": "field", "show_in_table": false}}, "column_name": "Office Location", "object_type": "list", "show_in_table": true}}, "column_name": null, "object_type": "list", "show_in_table": false}',
          },
          {
            id: 9,
            name: 'Institutions Related List',
            description:
              'This section contains lists of institutions gathered from different sources and matched with the institution list in CLARISA. Users can preview and export the list by clicking the ‘Display control list’ button below. ',
            route: 'api/institutionsSimpleRelated',
            http_method: 'GET',
            request_json: 'null',
            response_json:
              '{"type": "response", "order": null, "properties": {"code": {"type": "number", "order": 0, "properties": null, "column_name": "Code", "object_type": "field", "show_in_table": true}, "name": {"type": "string", "order": 2, "properties": null, "column_name": "Name", "object_type": "field", "show_in_table": true}, "acronym": {"type": "string", "order": 1, "properties": null, "column_name": "Acronym", "object_type": "field", "show_in_table": true}, "hqLocation": {"type": "string", "order": null, "properties": null, "column_name": null, "object_type": "field", "show_in_table": false}, "websiteLink": {"type": "string", "order": null, "properties": null, "column_name": null, "object_type": "field", "show_in_table": false}, "institutionType": {"type": "string", "order": null, "properties": null, "column_name": null, "object_type": "field", "show_in_table": false}, "institutionTypeId": {"type": "number", "order": null, "properties": null, "column_name": null, "object_type": "field", "show_in_table": false}, "hqLocationISOalpha2": {"type": "string", "order": null, "properties": null, "column_name": null, "object_type": "field", "show_in_table": false}, "institutionRelatedList": {"type": "institutionRelatedList", "order": 3, "properties": {"source": {"type": "string", "order": 0, "properties": null, "column_name": "Source", "object_type": "field", "show_in_table": true}, "clarisaId": {"type": "number", "order": null, "properties": null, "column_name": null, "object_type": "field", "show_in_table": false}, "institutionCode": {"type": "string", "order": 1, "properties": null, "column_name": "Code", "object_type": "field", "show_in_table": true}, "institutionName": {"type": "string", "order": 2, "properties": null, "column_name": "Name", "object_type": "field", "show_in_table": true}, "clarisaInstitutionName": {"type": "string", "order": null, "properties": null, "column_name": null, "object_type": "field", "show_in_table": false}}, "column_name": "Related Institutions", "object_type": "list", "show_in_table": true}}, "column_name": null, "object_type": "list", "show_in_table": false}',
          },
          {
            id: 10,
            name: 'Institution Types',
            description:
              'This list provides the institution types related to CGIAR activity, leaders, partners, and contributors. Users can preview and export the list by clicking the ‘Display control list’ button below. ',
            route: 'api/institution-types',
            http_method: 'GET',
            request_json: 'null',
            response_json:
              '{"type": "response", "order": null, "properties": {"code": {"type": "number", "order": 0, "properties": null, "column_name": "Code", "object_type": "field", "show_in_table": true}, "name": {"type": "string", "order": 1, "properties": null, "column_name": "Name", "object_type": "field", "show_in_table": true}}, "column_name": null, "object_type": "list", "show_in_table": false}',
          },
        ],
      },
      {
        id: 7,
        name: 'Research Strategy 2030',
        description:
          'This section collects the lists of CGIAR Research and Innovation Strategy. It contains lists covering various subjects, from CGIAR Action and Impact Areas to Sustainable Development Goals (SDGs). ',
        subcategories: [],
        endpoints: [
          {
            id: 11,
            name: 'Action Areas',
            description:
              'This list contains the three One CGIAR Action Areas: Systems Transformation, Resilient Agrifood Systems and Genetic Innovation. Users can preview and export the list by clicking the ‘Display control list’ button below. ',
            route: 'api/action-areas',
            http_method: 'GET',
            request_json: 'null',
            response_json:
              '{"type": "response", "order": null, "properties": {"id": {"type": "number", "order": 0, "properties": null, "column_name": "Code", "object_type": "field", "show_in_table": true}, "name": {"type": "string", "order": 1, "properties": null, "column_name": "Name", "object_type": "field", "show_in_table": true}, "description": {"type": "string", "order": 2, "properties": null, "column_name": "Description", "object_type": "field", "show_in_table": true}}, "column_name": null, "object_type": "list", "show_in_table": false}',
          },
          {
            id: 12,
            name: 'Impact Areas',
            description:
              'This list contains the five One CGIAR Impact Areas: Nutrition, health and food security; Poverty reduction, livelihoods and jobs; Gender equality, youth and inclusion; Climate adaptation and mitigation; Environmental health and biodiversity. These Impact Areas focus on five Sustainable Development Goals (SDGs). Users can preview and export the list by clicking the ‘Display control list’ button below. ',
            route: 'api/impact-areas',
            http_method: 'GET',
            request_json: 'null',
            response_json:
              '{"type": "response", "order": null, "properties": {"id": {"type": "number", "order": 0, "properties": null, "column_name": "Code", "object_type": "field", "show_in_table": true}, "name": {"type": "string", "order": 1, "properties": null, "column_name": "Name", "object_type": "field", "show_in_table": true}, "description": {"type": "string", "order": 2, "properties": null, "column_name": "Description", "object_type": "field", "show_in_table": true}, "financialCode": {"type": "string", "order": null, "properties": null, "column_name": null, "object_type": "field", "show_in_table": false}}, "column_name": null, "object_type": "list", "show_in_table": false}',
          },
          {
            id: 13,
            name: 'Impact Areas Indicators',
            description:
              'This list contains indicators formulated around the five One CGIAR Impact Areas. Users can preview and export the list by clicking the ‘Display control list’ button below. ',
            route: 'api/impact-area-indicators',
            http_method: 'GET',
            request_json: 'null',
            response_json:
              '{"type": "response", "order": null, "properties": {"value": {"type": "string", "order": 6, "properties": null, "column_name": "Indicator Target Value", "object_type": "field", "show_in_table": true}, "targetUnit": {"type": "string", "order": 5, "properties": null, "column_name": "Indicator Target Unit", "object_type": "field", "show_in_table": true}, "targetYear": {"type": "number", "order": 4, "properties": null, "column_name": "Indicator Target Year", "object_type": "field", "show_in_table": true}, "indicatorId": {"type": "number", "order": 0, "properties": null, "column_name": "Indicator ID", "object_type": "field", "show_in_table": true}, "impactAreaId": {"type": "number", "order": 2, "properties": null, "column_name": "Impact Area ID", "object_type": "field", "show_in_table": true}, "impactAreaName": {"type": "string", "order": 3, "properties": null, "column_name": "Impact Area Name", "object_type": "field", "show_in_table": true}, "indicatorStatement": {"type": "string", "order": 1, "properties": null, "column_name": "Indicator Statement", "object_type": "field", "show_in_table": true}, "isAplicableProjectedBenefits": {"type": "boolean", "order": null, "properties": null, "column_name": null, "object_type": "field", "show_in_table": false}}, "column_name": null, "object_type": "list", "show_in_table": false}',
          },
          {
            id: 14,
            name: 'Sustainable Development Goals',
            description:
              'This list contains all seventeen United Nations Sustainable Development Goals (SDGs). Users can preview and export the list by clicking the ‘Display control list’ button below. ',
            route: 'api/allSDG',
            http_method: 'GET',
            request_json: 'null',
            response_json:
              '{"type": "response", "order": null, "properties": {"full_name": {"type": "string", "order": 2, "properties": null, "column_name": "Full Name", "object_type": "field", "show_in_table": true}, "smo_code": {"type": "number", "order": 0, "properties": null, "column_name": "UN Code", "object_type": "field", "show_in_table": true}, "short_name": {"type": "string", "order": 1, "properties": null, "column_name": "Short Name", "object_type": "field", "show_in_table": true}, "financial_code": {"type": "string", "order": 2, "properties": null, "column_name": null, "object_type": "field", "show_in_table": false}}, "column_name": null, "object_type": "list", "show_in_table": false}',
          },
          {
            id: 15,
            name: 'SDG Targets',
            description:
              'This list contains United Nations Sustainable Development Goals (SDGs) targets. Users can preview and export the list by clicking the ‘Display control list’ button below. ',
            route: 'api/allSDGTargets',
            http_method: 'GET',
            request_json: 'null',
            response_json:
              '{"type": "response", "order": null, "properties": {"id": {"type": "number", "order": null, "properties": null, "column_name": null, "object_type": "field", "show_in_table": false}, "sdg": {"type": "sdg", "order": 2, "properties": {"fullName": {"type": "string", "order": null, "properties": null, "column_name": null, "object_type": "field", "show_in_table": false}, "usndCode": {"type": "number", "order": 0, "properties": null, "column_name": "UN Code", "object_type": "field", "show_in_table": true}, "shortName": {"type": "string", "order": 1, "properties": null, "column_name": "Short Name", "object_type": "field", "show_in_table": true}, "financialCode": {"type": "string", "order": 2, "properties": null, "column_name": null, "object_type": "field", "show_in_table": false}}, "column_name": "SDG", "object_type": "object", "show_in_table": true}, "sdgTarget": {"type": "string", "order": 1, "properties": null, "column_name": "SDG Target Narrative", "object_type": "field", "show_in_table": true}, "sdgTargetCode": {"type": "string", "order": 0, "properties": null, "column_name": "SDG Target Code", "object_type": "field", "show_in_table": true}}, "column_name": null, "object_type": "list", "show_in_table": false}',
          },
          {
            id: 16,
            name: 'SDG Indicators',
            description:
              'This list contains United Nations Sustainable Development Goals (SDGs) Indicators. Users can preview and export the list by clicking the ‘Display control list’ button below. ',
            route: 'api/allSDGIndicators',
            http_method: 'GET',
            request_json: 'null',
            response_json:
              '{"type": "response", "order": null, "properties": {"id": {"type": "number", "order": null, "properties": null, "column_name": null, "object_type": "field", "show_in_table": false}, "sdgTarget": {"type": "sdgTarget", "order": 3, "properties": {"id": {"type": "number", "order": null, "properties": null, "column_name": null, "object_type": "field", "show_in_table": false}, "sdg": {"type": "sdg", "order": null, "properties": {"fullName": {"type": "string", "order": null, "properties": null, "column_name": null, "object_type": "field", "show_in_table": false}, "usndCode": {"type": "number", "order": null, "properties": null, "column_name": null, "object_type": "field", "show_in_table": false}, "shortName": {"type": "string", "order": null, "properties": null, "column_name": null, "object_type": "field", "show_in_table": false}, "financialCode": {"type": "string", "order": 2, "properties": null, "column_name": null, "object_type": "field", "show_in_table": false}}, "column_name": null, "object_type": "object", "show_in_table": false}, "sdgTarget": {"type": "string", "order": 1, "properties": null, "column_name": "SDG Target Narrative", "object_type": "field", "show_in_table": true}, "sdgTargetCode": {"type": "string", "order": 0, "properties": null, "column_name": "SDG Target Code", "object_type": "field", "show_in_table": true}}, "column_name": "SDG Target", "object_type": "object", "show_in_table": true}, "indicatorCode": {"type": "string", "order": 1, "properties": null, "column_name": "SDG Indicator Code", "object_type": "field", "show_in_table": true}, "indicatorName": {"type": "string", "order": 2, "properties": null, "column_name": "SDG Indicator Name", "object_type": "field", "show_in_table": true}, "unsdIndicatorCode": {"type": "string", "order": 0, "properties": null, "column_name": "UNSD Indicator Code", "object_type": "field", "show_in_table": true}}, "column_name": null, "object_type": "list", "show_in_table": false}',
          },
          {
            id: 17,
            name: 'Initiatives',
            description:
              'This list contains all One CGIAR Research Initiatives, formulated around specific themes and impacts central to each Action Area. Users can preview and export the list by clicking the ‘Display control list’ button below. ',
            route: 'api/allInitiatives',
            http_method: 'GET',
            request_json: 'null',
            response_json:
              '{"type": "response", "order": null, "properties": {"id": {"type": "number", "order": null, "properties": null, "column_name": null, "object_type": "field", "show_in_table": false}, "name": {"type": "string", "order": 2, "properties": null, "column_name": "Full Name", "object_type": "field", "show_in_table": true}, "active": {"type": "number", "order": null, "properties": null, "column_name": null, "object_type": "field", "show_in_table": false}, "stages": {"type": "stages", "order": null, "properties": {"id": {"type": "number", "order": null, "properties": null, "column_name": null, "object_type": "field", "show_in_table": false}, "active": {"type": "number", "order": null, "properties": null, "column_name": null, "object_type": "field", "show_in_table": false}, "stageId": {"type": "number", "order": null, "properties": null, "column_name": null, "object_type": "field", "show_in_table": false}, "initvStgId": {"type": "number", "order": null, "properties": null, "column_name": null, "object_type": "field", "show_in_table": false}}, "column_name": null, "object_type": "list", "show_in_table": false}, "status": {"type": "string", "order": 3, "properties": null, "column_name": "Status", "object_type": "field", "show_in_table": true}, "stageId": {"type": "number", "order": null, "properties": null, "column_name": null, "object_type": "field", "show_in_table": false}, "short_name": {"type": "string", "order": 1, "properties": null, "column_name": "Short Name", "object_type": "field", "show_in_table": true}, "description": {"type": "string", "order": 5, "properties": null, "column_name": "Stage Description", "object_type": "field", "show_in_table": true}, "official_code": {"type": "string", "order": 0, "properties": null, "column_name": "Official Code", "object_type": "field", "show_in_table": true}, "action_area_id": {"type": "string", "order": null, "properties": null, "column_name": null, "object_type": "field", "show_in_table": false}, "action_area_description": {"type": "string", "order": 4, "properties": null, "column_name": "Action Area Name", "object_type": "field", "show_in_table": true}}, "column_name": null, "object_type": "list", "show_in_table": false}',
          },
          {
            id: 18,
            name: 'End of Initiative Outcomes',
            description:
              'This list displays all the End of Initiative Outcomes reported through the Online Submission Tool (OST) using the Theory of Change (TOC) Board. Users can preview and export the list by clicking the ‘Display control list’ button below. ',
            route: 'api/end-of-initiative-outcomes',
            http_method: 'GET',
            request_json: 'null',
            response_json:
              '{"type": "response", "order": null, "properties": {"initiativeId": {"type": "number", "order": null, "properties": null, "column_name": null, "object_type": "field", "show_in_table": false}, "initiative_name": {"type": "string", "order": 1, "properties": null, "column_name": "Initiative Full Name", "object_type": "field", "show_in_table": true}, "eoi_o": {"type": "initiativeOutcomes", "order": 2, "properties": {"toc_result_id": {"type": "string", "order": 0, "properties": null, "column_name": "EOI Outcome ID", "object_type": "field", "show_in_table": true}, "short_title": {"type": "string", "order": 1, "properties": null, "column_name": "EOI Outcome Short Title", "object_type": "field", "show_in_table": true}, "outcome_statement": {"type": "string", "order": 2, "properties": null, "column_name": "EOI Outcome Statement", "object_type": "field", "show_in_table": true}}, "column_name": "End of Initiative Outcomes", "object_type": "list", "show_in_table": true}, "stage_name": {"type": "string", "order": null, "properties": null, "column_name": null, "object_type": "field", "show_in_table": false}, "initiative_official_code": {"type": "string", "order": 0, "properties": null, "column_name": "Initiative Official Code", "object_type": "field", "show_in_table": true}}, "column_name": null, "object_type": "list", "show_in_table": false}',
          },
          {
            id: 19,
            name: 'Action Areas Outcomes',
            description:
              'This list contains the expected outcomes of Action Areas. Users can preview and export the list by clicking the ‘Display control list’ button below.',
            route: 'api/action-area-outcomes',
            http_method: 'GET',
            request_json: 'null',
            response_json:
              '{"type": "response", "order": null, "properties": {"outcomeId": {"type": "number", "order": 0, "properties": null, "column_name": "Outcome ID", "object_type": "field", "show_in_table": true}, "actionAreaId": {"type": "number", "order": 0, "properties": null, "column_name": "Action Area Code", "object_type": "field", "show_in_table": false}, "actionAreaName": {"type": "string", "order": 1, "properties": null, "column_name": "Action Area Name", "object_type": "field", "show_in_table": false}, "outcomeIndicatorSMOcode": {"type": "string", "order": 1, "properties": null, "column_name": "Outcome SMO Code", "object_type": "field", "show_in_table": true}, "outcomeIndicatorStatement": {"type": "string", "order": 2, "properties": null, "column_name": "Outcome Statement", "object_type": "field", "show_in_table": true}}, "column_name": null, "object_type": "list", "show_in_table": false}',
          },
          {
            id: 20,
            name: 'Action Areas Outcome Indicators',
            description: 'Test funtionality.',
            route: 'api/actionAreaOutcomeIndicators',
            http_method: 'GET',
            request_json: 'null',
            response_json:
              '{"type":"response","order":null,"properties":{"outcomeId":{"type":"number","order":2,"properties":null,"column_name":"Outcome ID","object_type":"field","show_in_table":true},"actionAreaId":{"type":"number","order":0,"properties":null,"column_name":"Action Area Code","object_type":"field","show_in_table":true},"actionAreaName":{"type":"string","order":1,"properties":null,"column_name":"Action Area Name","object_type":"field","show_in_table":true},"outcomeSMOcode":{"type":"string","order":3,"properties":null,"column_name":"Outcome SMO Code","object_type":"field","show_in_table":true},"outcomeStatement":{"type":"string","order":4,"properties":null,"column_name":"Outcome Indicator","object_type":"field","show_in_table":true},"outcomeIndicatorId":{"type":"number","order":2,"properties":null,"column_name":"Outcome ID","object_type":"field","show_in_table":true},"outcomeIndicatorsSMOcode":{"type":"string","order":3,"properties":null,"column_name":"Outcome SMO Code","object_type":"field","show_in_table":true},"outcomeIndicatorStatement":{"type":"string","order":4,"properties":null,"column_name":"Outcome Indicator","object_type":"field","show_in_table":true}},"column_name":null,"object_type":"list","show_in_table":false}',
          },
          {
            id: 21,
            name: 'Workpackages',
            description:
              'This list contains all the work packages. Users can preview and export the list by clicking the ‘Display control list’ button below. ',
            route: 'api/workpackages',
            http_method: 'GET',
            request_json: 'null',
            response_json:
              '{"type": "response", "order": null, "properties": {"name": {"type": "string", "order": 2, "properties": null, "column_name": "Name", "object_type": "field", "show_in_table": true}, "wp_id": {"type": "number", "order": 0, "properties": null, "column_name": "ID", "object_type": "field", "show_in_table": true}, "acronym": {"type": "string", "order": 1, "properties": null, "column_name": "Short Name", "object_type": "field", "show_in_table": true}, "results": {"type": "string", "order": null, "properties": null, "column_name": null, "object_type": "field", "show_in_table": false}, "stage_id": {"type": "number", "order": 4, "properties": null, "column_name": "Stage", "object_type": "field", "show_in_table": true}, "initiative_id": {"type": "number", "order": null, "properties": null, "column_name": null, "object_type": "field", "show_in_table": false}, "pathway_content": {"type": "string", "order": null, "properties": null, "column_name": null, "object_type": "field", "show_in_table": false}, "wp_official_code": {"type": "string", "order": null, "properties": null, "column_name": null, "object_type": "field", "show_in_table": false}, "initiative_status": {"type": "number", "order": null, "properties": null, "column_name": null, "object_type": "field", "show_in_table": false}, "initiative_offical_code": {"type": "string", "order": 3, "properties": null, "column_name": "Initiative Official Code", "object_type": "field", "show_in_table": true}}, "column_name": null, "object_type": "list", "show_in_table": false}',
          },
          {
            id: 22,
            name: 'MELIA study types',
            description:
              'This list provides the Monitoring, Evaluation, Learning and Impact Assessment (MELIA) study types from One CGIAR. Users can preview and export the list by clicking the ‘Display control list’ button below. ',
            route: 'api/study-types',
            http_method: 'GET',
            request_json: 'null',
            response_json:
              '{"type": "response", "order": null, "properties": {"id": {"type": "number", "order": 0, "properties": null, "column_name": "Code", "object_type": "field", "show_in_table": true}, "name": {"type": "string", "order": 1, "properties": null, "column_name": "Name", "object_type": "field", "show_in_table": true}, "description": {"type": "string", "order": 2, "properties": null, "column_name": "Description", "object_type": "field", "show_in_table": true}}, "column_name": null, "object_type": "list", "show_in_table": false}',
          },
        ],
      },
      {
        id: 8,
        name: 'Innovation Catalog',
        description:
          'This section collects the lists related to CGIAR Innovation Catalog. One example of the use of these lists can be referred to the Root Tuber and Bananas (RTB)’s Innovation Catalog, which documents RTB innovations using CLARISA’s standardized descriptor specifications.',
        subcategories: [],
        endpoints: [
          {
            id: 23,
            name: 'Business Category',
            description:
              'This list contains the six main business categories. Users can preview and export the list by clicking the ‘Display control list’ button below. ',
            route: 'api/business-categories',
            http_method: 'GET',
            request_json: 'null',
            response_json:
              '{"type": "response", "order": null, "properties": {"id": {"type": "number", "order": 0, "properties": null, "column_name": "Code", "object_type": "field", "show_in_table": true}, "name": {"type": "string", "order": 1, "properties": null, "column_name": "Name", "object_type": "field", "show_in_table": true}}, "column_name": null, "object_type": "list", "show_in_table": false}',
          },
          {
            id: 24,
            name: 'Technical Field',
            description:
              'This list contains the eight main technical fields. Users can preview and export the list by clicking the ‘Display control list’ button below.',
            route: 'api/technical-fields',
            http_method: 'GET',
            request_json: 'null',
            response_json:
              '{"type": "response", "order": null, "properties": {"id": {"type": "number", "order": 0, "properties": null, "column_name": "Code", "object_type": "field", "show_in_table": true}, "name": {"type": "string", "order": 1, "properties": null, "column_name": "Name", "object_type": "field", "show_in_table": true}}, "column_name": null, "object_type": "list", "show_in_table": false}',
          },
          {
            id: 25,
            name: 'Type of Innovation',
            description:
              'This list contains the five main types of innovations. Users can preview and export the list by clicking the ‘Display control list’ button below. ',
            route: 'api/type-of-innovations',
            http_method: 'GET',
            request_json: 'null',
            response_json:
              '{"type": "response", "order": null, "properties": {"code": {"type": "number", "order": 0, "properties": null, "column_name": "Code", "object_type": "field", "show_in_table": true}, "name": {"type": "string", "order": 1, "properties": null, "column_name": "Name", "object_type": "field", "show_in_table": true}, "definition": {"type": "string", "order": null, "properties": null, "column_name": null, "object_type": "field", "show_in_table": false}}, "column_name": null, "object_type": "list", "show_in_table": false}',
          },
          {
            id: 26,
            name: 'Governance Type',
            description:
              'This list contains the three main governance types: private, public or shared private and public. Users can preview and export the list by clicking the ‘Display control list’ button below. ',
            route: 'api/governance-types',
            http_method: 'GET',
            request_json: 'null',
            response_json:
              '{"type": "response", "order": null, "properties": {"id": {"type": "number", "order": 0, "properties": null, "column_name": "Code", "object_type": "field", "show_in_table": true}, "name": {"type": "string", "order": 1, "properties": null, "column_name": "Name", "object_type": "field", "show_in_table": true}}, "column_name": null, "object_type": "list", "show_in_table": false}',
          },
          {
            id: 27,
            name: 'Environmental Benefits',
            description:
              'This list contains the main environmental benefits, from biodiversity and ecosystems to water and fuel. Users can preview and export the list by clicking the ‘Display control list’ button below. ',
            route: 'api/environmental-benefits',
            http_method: 'GET',
            request_json: 'null',
            response_json:
              '{"type": "response", "order": null, "properties": {"id": {"type": "number", "order": 0, "properties": null, "column_name": "Code", "object_type": "field", "show_in_table": true}, "name": {"type": "string", "order": 1, "properties": null, "column_name": "Name", "object_type": "field", "show_in_table": true}}, "column_name": null, "object_type": "list", "show_in_table": false}',
          },
          {
            id: 28,
            name: 'Technology Development Stage',
            description:
              'This list contains various technology development stages. Users can preview and export the list by clicking the ‘Display control list’ button below.',
            route: 'api/technology-development-stages',
            http_method: 'GET',
            request_json: 'null',
            response_json:
              '{"type": "response", "order": null, "properties": {"id": {"type": "number", "order": 0, "properties": null, "column_name": "Code", "object_type": "field", "show_in_table": true}, "name": {"type": "string", "order": 1, "properties": null, "column_name": "Name", "object_type": "field", "show_in_table": true}, "officialCode": {"type": "string", "order": 1, "properties": null, "column_name": "Name", "object_type": "field", "show_in_table": true}}, "column_name": null, "object_type": "list", "show_in_table": false}',
          },
          {
            id: 29,
            name: 'Innovation Readiness Levels',
            description:
              'This list contains the different innovation readiness levels, from the idea to the proven innovation. Users can preview and export the list by clicking the ‘Display control list’ button below. ',
            route: 'api/innovation-readiness-levels',
            http_method: 'GET',
            request_json: 'null',
            response_json:
              '{"type": "response", "order": null, "properties": {"id": {"type": "number", "order": 0, "properties": null, "column_name": "Code", "object_type": "field", "show_in_table": true}, "name": {"type": "string", "order": 1, "properties": null, "column_name": "Name", "object_type": "field", "show_in_table": true}}, "column_name": null, "object_type": "list", "show_in_table": false}',
          },
          {
            id: 30,
            name: 'Administrative Scale',
            description: 'Test funtionality.',
            route: 'api/administrative-scales',
            http_method: 'GET',
            request_json: 'null',
            response_json:
              '{"type": "response", "order": null, "properties": {"code": {"type": "number", "order": 0, "properties": null, "column_name": "Code", "object_type": "field", "show_in_table": true}, "name": {"type": "string", "order": 1, "properties": null, "column_name": "Name", "object_type": "field", "show_in_table": true}}, "column_name": null, "object_type": "list", "show_in_table": false}',
          },
          {
            id: 31,
            name: 'Users',
            description:
              'This list contains the different user typologies, from farmers to financial institutions. Users can preview and export the list by clicking the ‘Display control list’ button below. ',
            route: 'api/oc-users',
            http_method: 'GET',
            request_json: 'null',
            response_json:
              '{"type": "response", "order": null, "properties": {"id": {"type": "number", "order": 0, "properties": null, "column_name": "Code", "object_type": "field", "show_in_table": true}, "name": {"type": "string", "order": 1, "properties": null, "column_name": "Name", "object_type": "field", "show_in_table": true}}, "column_name": null, "object_type": "list", "show_in_table": false}',
          },
          {
            id: 32,
            name: 'Beneficiaries',
            description:
              'This list contains the different beneficiary typologies, from farmers to financial institutions. Users can preview and export the list by clicking the ‘Display control list’ button below. ',
            route: 'api/beneficiaries',
            http_method: 'GET',
            request_json: 'null',
            response_json:
              '{"type": "response", "order": null, "properties": {"id": {"type": "number", "order": 0, "properties": null, "column_name": "Code", "object_type": "field", "show_in_table": true}, "name": {"type": "string", "order": 1, "properties": null, "column_name": "Name", "object_type": "field", "show_in_table": true}}, "column_name": null, "object_type": "list", "show_in_table": false}',
          },
          {
            id: 33,
            name: 'Type of Investment',
            description:
              'This list contains the different types of investments, from grants to venture capital. Users can preview and export the list by clicking the ‘Display control list’ button below. ',
            route: 'api/investment-types',
            http_method: 'GET',
            request_json: 'null',
            response_json:
              '{"type": "response", "order": null, "properties": {"id": {"type": "number", "order": 0, "properties": null, "column_name": "Code", "object_type": "field", "show_in_table": true}, "name": {"type": "string", "order": 1, "properties": null, "column_name": "Name", "object_type": "field", "show_in_table": true}}, "column_name": null, "object_type": "list", "show_in_table": false}',
          },
          {
            id: 34,
            name: 'Innovation Use Levels',
            description:
              'This list contains the different innovation use levels, from team to unconnected end-user. Users can preview and export the list by clicking the ‘Display control list’ button below. ',
            route: 'api/innovation-use-levels',
            http_method: 'GET',
            request_json: 'null',
            response_json:
              '{"type": "response", "order": null, "properties": {"id": {"type": "number", "order": 0, "properties": null, "column_name": "Code", "object_type": "field", "show_in_table": true}, "name": {"type": "string", "order": 1, "properties": null, "column_name": "Name", "object_type": "field", "show_in_table": true}}, "column_name": null, "object_type": "list", "show_in_table": false}',
          },
        ],
      },
    ],
    endpoints: [],
  },
  {
    id: 3,
    name: 'Additional Services',
    description: null,
    subcategories: [
      {
        id: 9,
        name: 'Institutions Management',
        description: null,
        subcategories: [],
        endpoints: [],
      },
      {
        id: 10,
        name: 'M-QAP Tool',
        description: null,
        subcategories: [],
        endpoints: [],
      },
    ],
    endpoints: [],
  },
  {
    id: 4,
    name: 'One CGIAR Operation',
    description:
      'CLARISA supports One CGIAR Business Operations and Finance team by providing a service to implement functionalities for the Corporate Performance management tool (CPM) to consolidate One CGIAR budget and financial reporting.',
    subcategories: [
      {
        id: 11,
        name: 'CGIAR Entities',
        description:
          'The list of REST-API services below contains some of the most important general control lists for SMO Finance and operation group and that can also be used to standardize and provide interoperability across any other CGIAR platforms.',
        subcategories: [],
        endpoints: [
          {
            id: 1,
            name: 'CGIAR entities',
            description:
              'This list contains the official list of CGIAR Centers, CGIAR Research Programs (CRPs), and CGIAR Platforms (PTFs). It also includes the list of entities that are no longer active. Users can preview and export the list by clicking the ‘Display control list’ button below. ',
            route: 'api/cgiar-entities',
            http_method: 'GET',
            request_json: 'null',
            response_json:
              '{"type": "response", "order": null, "properties": {"code": {"type": "number", "order": 0, "properties": null, "column_name": "Code", "object_type": "field", "show_in_table": true}, "name": {"type": "string", "order": 1, "properties": null, "column_name": "Name", "object_type": "field", "show_in_table": true}, "acronym": {"type": "string", "order": 2, "properties": null, "column_name": "Acronym", "object_type": "field", "show_in_table": true}, "cgiarEntityTypeDTO": {"type": "cgiarEntityTypeDTO", "order": 3, "properties": {"code": {"type": "number", "order": 0, "properties": null, "column_name": "Code", "object_type": "field", "show_in_table": true}, "name": {"type": "string", "order": 1, "properties": null, "column_name": "Name", "object_type": "field", "show_in_table": true}}, "column_name": "CGIAR Entity type", "object_type": "object", "show_in_table": true}}, "column_name": null, "object_type": "list", "show_in_table": false}',
          },
          {
            id: 2,
            name: 'CGIAR entity Types',
            description:
              'This list provides the entity types of CGIAR Research Programs (CRPs), CGIAR Platforms (PTFs), CGIAR Centers, CGIAR Initiatives and One CGIAR Platform. Users can preview and export the list by clicking the ‘Display control list’ button below. ',
            route: 'api/cgiar-entity-types',
            http_method: 'GET',
            request_json: 'null',
            response_json:
              '{"type": "response", "order": null, "properties": {"code": {"type": "number", "order": 0, "properties": null, "column_name": "Code", "object_type": "field", "show_in_table": true}, "name": {"type": "string", "order": 1, "properties": null, "column_name": "Name", "object_type": "field", "show_in_table": true}}, "column_name": null, "object_type": "list", "show_in_table": false}',
          },
        ],
      },
      {
        id: 12,
        name: 'CGIAR Accounts',
        description: null,
        subcategories: [],
        endpoints: [
          {
            id: 36,
            name: 'Accounts',
            description: '',
            route: 'api/accounts',
            http_method: 'GET',
            request_json: 'null',
            response_json:
              '{"type": "response", "order": null, "properties": {"code": {"type": "number", "order": 0, "properties": null, "column_name": "Code", "object_type": "field", "show_in_table": true}, "parent": {"type": "parent", "order": 4, "properties": {"code": {"type": "number", "order": null, "properties": null, "column_name": null, "object_type": "field", "show_in_table": false}, "description": {"type": "string", "order": 0, "properties": null, "column_name": "", "object_type": "field", "show_in_table": true}}, "column_name": "Parent", "object_type": "object", "show_in_table": true}, "accountType": {"type": "accountType", "order": 3, "properties": {"id": {"type": "number", "order": null, "properties": null, "column_name": null, "object_type": "field", "show_in_table": false}, "name": {"type": "string", "order": 0, "properties": null, "column_name": "", "object_type": "field", "show_in_table": true}}, "column_name": "Account type", "object_type": "object", "show_in_table": true}, "description": {"type": "string", "order": 1, "properties": null, "column_name": "Description", "object_type": "field", "show_in_table": true}, "financialCode": {"type": "string", "order": 2, "properties": null, "column_name": "Finance Code", "object_type": "field", "show_in_table": true}}, "column_name": null, "object_type": "list", "show_in_table": false}',
          },
          {
            id: 37,
            name: 'Account Types',
            description: '',
            route: 'api/accountTypes',
            http_method: 'GET',
            request_json: 'null',
            response_json:
              '{"type": "response", "order": null, "properties": {"id": {"type": "number", "order": 0, "properties": null, "column_name": "ID", "object_type": "field", "show_in_table": true}, "name": {"type": "string", "order": 1, "properties": null, "column_name": "Name", "object_type": "field", "show_in_table": true}}, "column_name": null, "object_type": "list", "show_in_table": false}',
          },
        ],
      },
      {
        id: 13,
        name: 'CGIAR Science Groups',
        description: null,
        subcategories: [],
        endpoints: [
          {
            id: 38,
            name: 'Science groups',
            description: '',
            route: 'api/scienceGroups',
            http_method: 'GET',
            request_json: 'null',
            response_json:
              '{"type": "response", "order": null, "properties": {"code": {"type": "number", "order": 0, "properties": null, "column_name": "Code", "object_type": "field", "show_in_table": true}, "parent": {"type": "parent", "order": 3, "properties": {"code": {"type": "number", "order": null, "properties": null, "column_name": null, "object_type": "field", "show_in_table": false}, "description": {"type": "string", "order": 0, "properties": null, "column_name": "", "object_type": "field", "show_in_table": true}}, "column_name": "Parent", "object_type": "object", "show_in_table": true}, "description": {"type": "string", "order": 2, "properties": null, "column_name": "Description", "object_type": "field", "show_in_table": true}, "financialCode": {"type": "string", "order": 1, "properties": null, "column_name": "Financial Code", "object_type": "field", "show_in_table": true}}, "column_name": null, "object_type": "list", "show_in_table": false}',
          },
        ],
      },
      {
        id: 14,
        name: 'CGIAR Units',
        description: null,
        subcategories: [],
        endpoints: [
          {
            id: 39,
            name: 'Units',
            description: '',
            route: 'api/units',
            http_method: 'GET',
            request_json: 'null',
            response_json:
              '{"type": "response", "order": null, "properties": {"code": {"type": "number", "order": null, "properties": null, "column_name": null, "object_type": "field", "show_in_table": false}, "parent": {"type": "parent", "order": 4, "properties": {"code": {"type": "Number", "order": null, "properties": null, "column_name": null, "object_type": "field", "show_in_table": false}, "description": {"type": "string", "order": 0, "properties": null, "column_name": "", "object_type": "field", "show_in_table": true}}, "column_name": "Parent", "object_type": "object", "show_in_table": true}, "unitType": {"type": "unitType", "order": 2, "properties": {"code": {"type": "Number", "order": null, "properties": null, "column_name": null, "object_type": "field", "show_in_table": false}, "acronym": {"type": "string", "order": 0, "properties": null, "column_name": "", "object_type": "field", "show_in_table": true}, "description": {"type": "string", "order": 1, "properties": null, "column_name": "", "object_type": "field", "show_in_table": true}}, "column_name": "Unit Type", "object_type": "object", "show_in_table": true}, "description": {"type": "string", "order": 1, "properties": null, "column_name": "Description", "object_type": "field", "show_in_table": true}, "scienceGroup": {"type": "scienceGroup", "order": 3, "properties": {"code": {"type": "Number", "order": null, "properties": null, "column_name": null, "object_type": "field", "show_in_table": false}, "description": {"type": "string", "order": 0, "properties": null, "column_name": "", "object_type": "field", "show_in_table": true}}, "column_name": "Science Group", "object_type": "object", "show_in_table": true}, "financialCode": {"type": "string", "order": 0, "properties": null, "column_name": "Code", "object_type": "field", "show_in_table": true}}, "column_name": null, "object_type": "list", "show_in_table": false}',
          },
        ],
      },
      {
        id: 15,
        name: 'CGIAR Impact Areas',
        description:
          'CGIAR is targeting multiple SDG benefits across five Impact Areas. Working with others, for each of the Impact Areas CGIAR contributes to collective global targets for the transformation of food, land, and water systems across local, regional, and global levels. In each Action Area, designated Platforms will foster critical thinking and use of evidence to improve their focus on the scaling of innovation and impact from research. CGIAR Impact Areas include: (I) Nutrition, health and food security; (II) Poverty reduction, livelihoods and jobs; (III) Gender equality, youth and inclusion; (IV) Climate adaptation and mitigation; (V) Environmental health and biodiversity.',
        subcategories: [],
        endpoints: [
          {
            id: 12,
            name: 'Impact Areas',
            description:
              'This list contains the five One CGIAR Impact Areas: Nutrition, health and food security; Poverty reduction, livelihoods and jobs; Gender equality, youth and inclusion; Climate adaptation and mitigation; Environmental health and biodiversity. These Impact Areas focus on five Sustainable Development Goals (SDGs). Users can preview and export the list by clicking the ‘Display control list’ button below. ',
            route: 'api/impact-areas',
            http_method: 'GET',
            request_json: 'null',
            response_json:
              '{"type": "response", "order": null, "properties": {"id": {"type": "number", "order": 0, "properties": null, "column_name": "Code", "object_type": "field", "show_in_table": true}, "name": {"type": "string", "order": 1, "properties": null, "column_name": "Name", "object_type": "field", "show_in_table": true}, "description": {"type": "string", "order": 2, "properties": null, "column_name": "Description", "object_type": "field", "show_in_table": true}, "financialCode": {"type": "string", "order": null, "properties": null, "column_name": null, "object_type": "field", "show_in_table": false}}, "column_name": null, "object_type": "list", "show_in_table": false}',
          },
          {
            id: 14,
            name: 'Sustainable Development Goals',
            description:
              'This list contains all seventeen United Nations Sustainable Development Goals (SDGs). Users can preview and export the list by clicking the ‘Display control list’ button below. ',
            route: 'api/allSDG',
            http_method: 'GET',
            request_json: 'null',
            response_json:
              '{"type": "response", "order": null, "properties": {"full_name": {"type": "string", "order": 2, "properties": null, "column_name": "Full Name", "object_type": "field", "show_in_table": true}, "smo_code": {"type": "number", "order": 0, "properties": null, "column_name": "UN Code", "object_type": "field", "show_in_table": true}, "short_name": {"type": "string", "order": 1, "properties": null, "column_name": "Short Name", "object_type": "field", "show_in_table": true}, "financial_code": {"type": "string", "order": 2, "properties": null, "column_name": null, "object_type": "field", "show_in_table": false}}, "column_name": null, "object_type": "list", "show_in_table": false}',
          },
        ],
      },
    ],
    endpoints: [],
  },
];
