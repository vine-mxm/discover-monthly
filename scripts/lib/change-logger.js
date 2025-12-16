import fs from 'fs/promises';
import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const LOG_FILE = join(__dirname, '..', '..', 'data', 'changes.log');

export class ChangeLogger {
  /**
   * Carica log esistente
   */
  static async loadLog() {
    if (!existsSync(LOG_FILE)) {
      return {
        lastRun: null,
        changes: [],
      };
    }
    
    try {
      const content = await fs.readFile(LOG_FILE, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.warn(`⚠ Warning: Could not load change log: ${error.message}`);
      return {
        lastRun: null,
        changes: [],
      };
    }
  }

  /**
   * Salva log
   */
  static async saveLog(logData) {
    try {
      await fs.writeFile(
        LOG_FILE,
        JSON.stringify(logData, null, 2),
        'utf-8'
      );
    } catch (error) {
      console.warn(`⚠ Warning: Could not save change log: ${error.message}`);
    }
  }

  /**
   * Aggiungi una voce al log
   */
  static async log(change) {
    const logData = await this.loadLog();
    
    logData.lastRun = new Date().toISOString();
    logData.changes.push({
      timestamp: new Date().toISOString(),
      ...change,
    });
    
    // Mantieni solo ultimi 1000 cambiamenti per evitare file troppo grandi
    if (logData.changes.length > 1000) {
      logData.changes = logData.changes.slice(-1000);
    }
    
    await this.saveLog(logData);
  }

  /**
   * Ottieni log
   */
  static async getLog() {
    return await this.loadLog();
  }

  /**
   * Pulisci log
   */
  static async clearLog() {
    await this.saveLog({
      lastRun: null,
      changes: [],
    });
  }
}
