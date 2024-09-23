import { OnModuleInit } from '@nestjs/common';
import Handlebars from 'handlebars';
import { env } from 'process';
import path from 'path';
import fs from 'fs/promises';

export class HandlebarsCompiler implements OnModuleInit {
  onModuleInit() {
    Handlebars.registerHelper('current_year', () => new Date().getFullYear());
    Handlebars.registerHelper('support_email', () => env.SUPPORT_EMAIL);
  }

  private loadUpTemplate(relativePath: string): Promise<string> {
    return fs.readFile(path.join(__dirname, relativePath), {
      encoding: 'utf-8',
    });
  }

  public async compileTemplate<T>(
    templatePath: string,
    data: T,
  ): Promise<string> {
    return this.loadUpTemplate(templatePath).then((template) => {
      const compiledTemplate = Handlebars.compile(template);
      return compiledTemplate(data);
    });
  }
}
