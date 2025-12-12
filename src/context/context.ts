/**
 * Kyrin Framework - Context
 * ศูนย์กลางการจัดการ Request/Response
 */

export class Context {
  // เก็บ Request,Response ต้นฉบับไว้ เผื่อคนใช้อยากเข้าถึงแบบดิบๆ
  readonly req: Request;

  // เก็บ URL Object (จะสร้างเมื่อจำเป็นเท่านั้น - Lazy)
  private _url?: URL;

  // เก็บ Path Param
  params?: Record<string, string>;

  constructor(req: Request, params?: Record<string, string>) {
    this.req = req;
    if (params) this.params = params;
  }

  // --- ส่วนจัดการขาเข้า (Request Helpers) ---
  // Expose path โดยตรง (minimal!)
  public get path(): string {
    return this.url.pathname;
  }

  get method(): string {
    return this.req.method;
  }

  // Getter สำหรับดึง URL Object (Lazy Loading)
  // ถ้ายังไม่เคยเรียกใช้ จะ new URL() ให้
  // ถ้าเคยเรียกแล้ว จะเอาตัวเดิมมาใช้ (ประหยัด CPU)
  private get url(): URL {
    if (!this._url) {
      this._url = new URL(this.req.url); // ทำงานแค่ครั้งแรกที่เรียก
    }
    return this._url;
  }

  // path param
  param(key: string): string | null {
    return this.params?.[key] || null;
  }

  // query param
  query(key: string): string | null {
    return this.url.searchParams.get(key);
  }

  // ดึง Body แบบ JSON (async)
  async body<T = any>(): Promise<T> {
    return (await this.req.json()) as T;
  }

  // --- ส่วนจัดการขาออก (Response Helpers) ---
  //   ตอบ json
  public json(data: any, status?: number) {
    return new Response(JSON.stringify(data), {
      headers: {
        "Content-Type": "application/json",
      },
      status: status || 200,
    });
  }

  //   ตอบ text
  public text(data: string, status?: number) {
    return new Response(data, {
      headers: {
        "Content-Type": "text/plain",
      },
      status: status || 200,
    });
  }

  //   ตอบ html
  public html(data: string, status?: number) {
    return new Response(data, {
      headers: {
        "Content-Type": "text/html",
      },
      status: status || 200,
    });
  }
}
