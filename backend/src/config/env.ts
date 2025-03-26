import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

// Load environment variables from the root directory
dotenv.config({ path: path.resolve(dirname, '../../.env') });
