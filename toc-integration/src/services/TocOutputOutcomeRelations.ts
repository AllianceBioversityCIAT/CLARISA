import { Connection } from "typeorm";
import { Database } from "../database/db";
import { ErrorValidators } from "../validators/errorsValidators";
import { ValidatorTypes } from "../validators/validatorType";
import { TocOutputOutcomeRelation } from "../entities/tocOutputOutcomeRelation";

export class TocOutputOutcomeRelationService {
  public validatorType = new ValidatorTypes();
  public errorMessage = new ErrorValidators();
  public database = new Database();

  async saveRelationsOutputOutcomes(relations: any, idInitiative: string) {
    let dbConn: Connection = await this.database.getConnection();
    let outcomeOutputRelations = await dbConn.getRepository(
      TocOutputOutcomeRelation
    );
    let listOutcomeOutputRelations = [];
    try {
      const relationExists = await outcomeOutputRelations.find({
        where: { id_toc_initiative: idInitiative, is_active: true },
      });

      if (this.validatorType.validatorIsArray(relationExists)) {
        for (let r of relationExists) {
          r.is_active = false;
          listOutcomeOutputRelations.push(r);
        }
      }

      if (this.validatorType.validatorIsArray(relations)) {
        for (let r of relations) {
          let relation = new TocOutputOutcomeRelation();
          relation.id_toc_initiative = idInitiative;
          relation.from = r.from;
          relation.to = r.to;
          relation.is_active = true;
          listOutcomeOutputRelations.push(relation);
        }
      }

      return await outcomeOutputRelations.save(listOutcomeOutputRelations);
    } catch (error) {
      const errorObj = {
        code: "DATABASE_ERROR",
        message: "Error saving relations output outcomes",
        error,
      };
      console.error(errorObj);
      throw errorObj;
    } finally {
      dbConn.close();
    }
  }
}
