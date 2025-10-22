import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateCgiarEntityTypeJsonStructure1759354373378 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            UPDATE hp_clarisa_endpoints
            SET response_json = '{
                "type": "response",
                "order": null,
                "properties": {
                    "code": {
                        "type": "number",
                        "order": 0,
                        "properties": null,
                        "column_name": "Code",
                        "object_type": "field",
                        "show_in_table": true,
                        "display_method": "inherit"
                    },
                    "name": {
                        "type": "string",
                        "order": 1,
                        "properties": null,
                        "column_name": "Name",
                        "object_type": "field",
                        "show_in_table": true,
                        "display_method": "inherit"
                    },
                    "portfolio": {
                        "type": "string",
                        "order": 2,
                        "properties": null,
                        "column_name": "Portfolio",
                        "object_type": "field",
                        "show_in_table": true,
                        "display_method": "inherit"
                    }
                },
                "column_name": null,
                "object_type": "list",
                "show_in_table": false,
                "display_method": "column"
            }'
            WHERE id = 2;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            UPDATE hp_clarisa_endpoints
            SET response_json = '{
                "type": "response",
                "order": null,
                "properties": {
                    "code": {
                        "type": "number",
                        "order": 0,
                        "properties": null,
                        "column_name": "Code",
                        "object_type": "field",
                        "show_in_table": true,
                        "display_method": "inherit"
                    },
                    "name": {
                        "type": "string",
                        "order": 1,
                        "properties": null,
                        "column_name": "Name",
                        "object_type": "field",
                        "show_in_table": true,
                        "display_method": "inherit"
                    }
                },
                "column_name": null,
                "object_type": "list",
                "show_in_table": false,
                "display_method": "column"
            }'
            WHERE id = 2;
        `);
    }

}
