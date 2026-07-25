declare module 'layui' {
  const layui: {
    use: (mods: string | string[] | (() => void), cb?: (...args: unknown[]) => void) => void
    layer: {
      open: (options: Record<string, unknown>) => number
      close: (index: number) => void
      closeAll: (type?: string) => void
    }
    form: {
      render: (type?: string, filter?: string) => void
      on: (event: string, callback: (data: { elem: HTMLElement; value: string; othis: unknown }) => void) => void
      val: (filter: string, obj?: Record<string, unknown>) => Record<string, unknown> | void
    }
    laydate: {
      render: (options: Record<string, unknown>) => { config: Record<string, unknown> }
    }
  }
  export default layui
}
