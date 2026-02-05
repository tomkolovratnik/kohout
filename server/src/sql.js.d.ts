declare module 'sql.js-fts5' {
  interface Database {
    run(sql: string, params?: any[]): void;
    // sql.js Database.exec - executes SQL and returns results
    exec(sql: string): QueryExecResult[];
    prepare(sql: string): Statement;
    export(): Uint8Array;
    close(): void;
  }

  interface Statement {
    bind(params?: any[]): boolean;
    step(): boolean;
    get(params?: any[]): any[];
    getAsObject(params?: any[]): Record<string, any>;
    free(): boolean;
  }

  interface QueryExecResult {
    columns: string[];
    values: any[][];
  }

  interface SqlJsStatic {
    Database: new (data?: ArrayLike<number> | Buffer | null) => Database;
  }

  interface InitOptions {
    locateFile?: (file: string) => string;
    wasmBinary?: ArrayLike<number> | Buffer;
  }

  export default function initSqlJs(options?: InitOptions): Promise<SqlJsStatic>;
  export type { Database, Statement, QueryExecResult, SqlJsStatic };
}
