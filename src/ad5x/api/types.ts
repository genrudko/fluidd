export type Ad5xCapabilities = Readonly<Record<string, unknown>>

export interface Ad5xApi {
  getCapabilities: () => Promise<Ad5xCapabilities>
}

export interface Ad5xSocketTransport {
  emit: (method: string) => Promise<unknown>
}
