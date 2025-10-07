import fs from 'fs';
import path from 'path';
import Ajv, { ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';

export type NFeSchemaType = 'resNFe' | 'resEvento';

export class NFeSchemaService {
  private static validators: Record<NFeSchemaType, ValidateFunction>;
  private static loaded = false;

  static init(): void {
    if (this.loaded) return;
    const ajv = new Ajv({ allErrors: true });
    addFormats(ajv);

    // Use project root so runtime (dist) finds the JSON files in repository
    const schemasDir = path.resolve(process.cwd(), 'schemas');
    if (!fs.existsSync(schemasDir)) {
      throw new Error(`Pasta de schemas não encontrada: ${schemasDir}`);
    }

    // Load all .json schemas to support $ref across files
    const schemaFiles = fs.readdirSync(schemasDir).filter((f) => f.toLowerCase().endsWith('.json'));
    for (const file of schemaFiles) {
      try {
        const full = path.join(schemasDir, file);
        const schemaObj = JSON.parse(fs.readFileSync(full, 'utf-8'));
        ajv.addSchema(schemaObj);
      } catch (e) {
        // continue but log in console for diagnostics
        // eslint-disable-next-line no-console
        console.warn(`Falha ao carregar schema ${file}:`, (e as Error).message);
      }
    }

    // Compile main validators (explicit roots)
    const resNFeSchemaPath = path.join(schemasDir, 'resNFe.schema.json');
    const resEventoSchemaPath = path.join(schemasDir, 'resEvento.schema.json');
    const resNFeSchema = JSON.parse(fs.readFileSync(resNFeSchemaPath, 'utf-8'));
    const resEventoSchema = JSON.parse(fs.readFileSync(resEventoSchemaPath, 'utf-8'));

    const resNFeValidator = ajv.compile(resNFeSchema);
    const resEventoValidator = ajv.compile(resEventoSchema);

    this.validators = {
      resNFe: resNFeValidator,
      resEvento: resEventoValidator,
    };
    this.loaded = true;
  }

  static validate(type: NFeSchemaType, payload: unknown) {
    this.init();
    const validator = this.validators[type];
    const valid = validator(payload);
    const rawErrors = valid ? [] : (validator.errors || []);
    return {
      valid: Boolean(valid),
      errors: this.formatErrors(rawErrors),
      rawErrors,
    };
  }

  static loadExample(type: NFeSchemaType) {
    const examplesDir = path.resolve(process.cwd(), 'examples');
    const filename = type === 'resNFe' ? 'resNFe_example.json' : 'resEvento_example.json';
    const examplePath = path.join(examplesDir, filename);
    const raw = fs.readFileSync(examplePath, 'utf-8');
    return JSON.parse(raw);
  }

  static formatErrors(errors: any[]) {
    if (!errors || errors.length === 0) return [] as any[];
    return errors.map((e) => ({
      path: e.instancePath || e.schemaPath || '',
      keyword: e.keyword,
      message: e.message,
      params: e.params,
    }));
  }
}