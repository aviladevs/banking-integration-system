import express from 'express';
import zlib from 'zlib';
import { XMLParser } from 'fast-xml-parser';
import { NFeSchemaService, NFeSchemaType } from '../services/NFeSchemaService';

const router = express.Router();

// Validate payload against a schema
router.post('/validate/:type', async (req, res): Promise<void> => {
  try {
    const type = (req.params.type as NFeSchemaType);
    if (!['resNFe', 'resEvento'].includes(type)) {
      res.status(400).json({ success: false, message: 'Tipo inválido. Use resNFe ou resEvento.' });
      return;
    }
    const payload = req.body;
  const result = NFeSchemaService.validate(type, payload);
  res.json({ success: result.valid, errors: result.errors, rawErrors: result.rawErrors });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Erro ao validar payload', error: err.message });
  }
});

// Validate bundled examples
router.get('/examples/:type', async (req, res): Promise<void> => {
  try {
    const type = (req.params.type as NFeSchemaType);
    if (!['resNFe', 'resEvento'].includes(type)) {
      res.status(400).json({ success: false, message: 'Tipo inválido. Use resNFe ou resEvento.' });
      return;
    }
    const example = NFeSchemaService.loadExample(type);
  const result = NFeSchemaService.validate(type, example);
  res.json({ success: result.valid, errors: result.errors, rawErrors: result.rawErrors, example });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Erro ao validar exemplo', error: err.message });
  }
});

// Decode docZip (base64 + gzip) and return text
router.post('/decode-doczip', async (req, res): Promise<void> => {
  try {
    const { docZipBase64 } = req.body as { docZipBase64?: string };
    if (!docZipBase64) {
      res.status(400).json({ success: false, message: 'docZipBase64 é obrigatório' });
      return;
    }
    const gzBuffer = Buffer.from(docZipBase64, 'base64');
    const xmlBuffer = zlib.gunzipSync(gzBuffer);
    const content = xmlBuffer.toString('utf-8');
  res.json({ success: true, contentType: 'xml', content });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Erro ao decodificar docZip', error: err.message });
  }
});

export default router;
 
// Validate XML payload (or docZip) against a schema after converting to JSON
router.post('/validate-xml/:type', async (req, res): Promise<void> => {
  try {
    const type = (req.params.type as NFeSchemaType);
    if (!['resNFe', 'resEvento'].includes(type)) {
      res.status(400).json({ success: false, message: 'Tipo inválido. Use resNFe ou resEvento.' });
      return;
    }

  let { xml, docZipBase64, jsonPath } = req.body as { xml?: string; docZipBase64?: string; jsonPath?: string };
    let xmlContent = xml || '';
    if (!xmlContent && docZipBase64) {
      const gzBuffer = Buffer.from(docZipBase64, 'base64');
      const xmlBuffer = zlib.gunzipSync(gzBuffer);
      xmlContent = xmlBuffer.toString('utf-8');
    }
    if (!xmlContent) {
      res.status(400).json({ success: false, message: 'Envie o campo xml ou docZipBase64' });
      return;
    }

    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', parseAttributeValue: true, parseTagValue: true });
    let jsonObj: any = parser.parse(xmlContent);

    // If not provided, try defaulting to the root key named after the type
    if (!jsonPath) {
      jsonPath = type; // e.g., 'resNFe' or 'resEvento'
    }

    // Navigate into a nested object using a dot path
    if (jsonPath) {
      const parts = jsonPath.split('.').filter(Boolean);
      for (const p of parts) {
        if (jsonObj && Object.prototype.hasOwnProperty.call(jsonObj, p)) {
          jsonObj = jsonObj[p];
        } else {
          res.status(400).json({ success: false, message: `jsonPath não encontrado: ${jsonPath}` });
          return;
        }
      }
    }

  const result = NFeSchemaService.validate(type, jsonObj);
  res.json({ success: result.valid, errors: result.errors, rawErrors: result.rawErrors });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Erro ao validar XML', error: err.message });
  }
});