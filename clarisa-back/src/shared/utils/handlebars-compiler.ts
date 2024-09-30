import { Inject, OnModuleInit } from '@nestjs/common';
import Handlebars from 'handlebars';
import path from 'path';
import fs from 'fs/promises';
import { AppConfig } from './app-config';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';

/**
 * The `HandlebarsCompiler` class is responsible for compiling Handlebars templates.
 * It implements the `OnModuleInit` interface to register Handlebars helpers when the module is initialized.
 *
 * @class `HandlebarsCompiler`
 * @implements {OnModuleInit}
 */
export class HandlebarsCompiler implements OnModuleInit {
  constructor(
    @Inject() private appConfig: AppConfig,
    @Inject(CACHE_MANAGER) private cache: Cache,
  ) {}

  /**
   * Registers Handlebars helpers when the module is initialized.
   *
   * This method registers two Handlebars helpers:
   * - `current_year`: Returns the current year.
   * - `support_email`: Returns the support email address from the environment variables.
   */
  async onModuleInit() {
    const supportEmail = await this.cache.get(this.appConfig.supportEmailParam);
    Handlebars.registerHelper('current_year', () => new Date().getFullYear());
    Handlebars.registerHelper('support_email', () => supportEmail);
  }

  /**
   * Loads a template file from a given relative path.
   *
   * @param {string} relativePath - The relative path to the template file.
   * @returns {Promise<string>} A promise that resolves to the content of the template file as a string.
   */
  private _loadUpTemplate(relativePath: string): Promise<string> {
    return fs.readFile(path.join(__dirname, relativePath), {
      encoding: 'utf-8',
    });
  }

  /**
   * Compiles a Handlebars template with the provided data.
   *
   * @template T - The type of the data to be used in the template.
   * @param {string} templatePath - The relative path to the Handlebars template file.
   * @param {T} data - The data to be injected into the template.
   * @returns {Promise<string>} - A promise that resolves to the compiled template as a string.
   */
  public async compileTemplate<T>(template: string, data: T): Promise<string> {
    const compiledTemplate = Handlebars.compile(template);
    return compiledTemplate(data);
  }
}
