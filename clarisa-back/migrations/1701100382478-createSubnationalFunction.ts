import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSubnationalFunction1701100382478
  implements MigrationInterface
{
  name = 'CreateSubnationalFunction1701100382478';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        create function getSubnationalScopeData(query_parameters json) returns json
            begin
                declare original_sql_mode text;
                declare original_group_concat_len bigint unsigned;
                declare subnational_scope_data json;
            
                set original_sql_mode = (select @@sql_mode);
                SET sql_mode = (SELECT REPLACE(@@sql_mode,'ONLY_FULL_GROUP_BY',''));
            
                set original_group_concat_len = (select @@group_concat_max_len);
                set @@group_concat_max_len=150000;
            
                select cast(concat('[', group_concat(q1.json_response separator ', '), ']') as json) into subnational_scope_data
                from(
                    select json_object(
                        "id", iss.id, 
                        "code", iss.code, 
                        "name", iss.name, 
                        "local_name", iss.local_name, 
                        "other_names", (
                            select cast(concat('[', group_concat(q2.json_response separator ', '), ']') as json)
                            from (
                                select json_object(
                                    "name", iss_q2.name,
                                    "local_name", iss_q2.local_name, 
                                    "romanization_system_name", iss_q2.romanization_system_name, 
                                    "language_iso_2", il_q2.iso_alpha_2
                                ) as json_response
                                from iso_subnational_scope iss_q2
                                cross join iso_country_languages icl_q2 on iss_q2.country_id = icl_q2.country_id and iss_q2.iso_language_id = icl_q2.iso_language_id and icl_q2.is_active = icl.is_active
                                left join iso_languages il_q2 on icl_q2.iso_language_id = il_q2.id and il_q2.is_active = il.is_active
                                where iss_q2.id <> iss.id and iss_q2.code = iss.code and iss_q2.is_active = iss.is_active
                                order by iss_q2.code
                            ) as q2
                        ),
                        "romanization_system_name", iss.romanization_system_name, 
                        "language_iso_2", il.iso_alpha_2, 
                        "subnational_category_name", isc.name, 
                        "country_id", c.id, 
                        "country_iso_alpha_2", c.iso_alpha_2, 
                        "country_name", c.name,
                        "is_active", iss.is_active
                    ) as json_response from iso_subnational_scope iss
                    join iso_subnational_categories isc on iss.iso_subnational_category_id = isc.id and isc.is_active 
                    join countries c on iss.country_id = c.id and c.is_active
                    cross join iso_country_languages icl on iss.country_id = icl.country_id and iss.iso_language_id = icl.iso_language_id and icl.is_active
                    left join iso_languages il on icl.iso_language_id = il.id and il.is_active
                    where (
                        CASE 
                            when (JSON_VALUE(query_parameters, '$.is_active') IS NOT NULL) THEN 
                                iss.is_active = JSON_VALUE(query_parameters, '$.is_active') 
                            ELSE
                                1
                        END
                    ) and (
                        CASE
                            when (JSON_VALUE(query_parameters, '$.country_id') IS NOT NULL) THEN 
                                c.id = JSON_VALUE(query_parameters, '$.country_id')
                            when (JSON_VALUE(query_parameters, '$.country_iso2') IS NOT NULL) THEN 
                                c.iso_alpha_2 = JSON_VALUE(query_parameters, '$.country_iso2')
                            when (JSON_VALUE(query_parameters, '$.subnational_id') IS NOT NULL) THEN 
                                iss.id = JSON_VALUE(query_parameters, '$.subnational_id') 
                            when (JSON_VALUE(query_parameters, '$.subnational_code') IS NOT NULL) THEN 
                                iss.code = JSON_VALUE(query_parameters, '$.subnational_code') 
                            ELSE
                                1
                        END
                    )
                    group by iss.code
                    order by iss.id, icl.id
                ) as q1
                ;
            
                SET sql_mode = original_sql_mode;
                set group_concat_max_len = original_group_concat_len;
            
                return subnational_scope_data;
            end
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`drop function getSubnationalScopeData;`);
  }
}
