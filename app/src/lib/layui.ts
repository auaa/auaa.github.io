import 'layui/dist/css/layui.css'

export interface LayerApi {
  open: (options: Record<string, unknown>) => number
  close: (index: number) => void
  closeAll: (type?: string) => void
}

export interface FormApi {
  render: (type?: string, filter?: string) => void
  on: (event: string, callback: (data: { elem: HTMLElement; value: string; othis: unknown }) => void) => void
  val: (filter: string, obj?: Record<string, unknown>) => Record<string, unknown> | void
}

export interface LaydateApi {
  render: (options: Record<string, unknown>) => { config: Record<string, unknown> }
}

export type LayuiKit = {
  layui: LayuiGlobal
  layer: LayerApi
  form: FormApi
  laydate: LaydateApi
}

type LayuiGlobal = {
  use: (mods: string | string[] | (() => void), cb?: (...args: unknown[]) => void) => void
  layer: LayerApi
  form: FormApi
  laydate: LaydateApi
}

let ready: Promise<LayuiKit> | null = null

export function getLayui(): Promise<LayuiKit> {
  if (!ready) {
    ready = import('layui').then((mod) => {
      const layui = ((mod as { default?: LayuiGlobal }).default ?? mod) as LayuiGlobal
      return new Promise<LayuiKit>((resolve) => {
        layui.use(['layer', 'form', 'laydate'], () => {
          resolve({
            layui,
            layer: layui.layer,
            form: layui.form,
            laydate: layui.laydate,
          })
        })
      })
    })
  }
  return ready
}

/** @deprecated 使用 getLayui().then(k => k.layer) */
export function getLayer(): Promise<LayerApi> {
  return getLayui().then((k) => k.layer)
}
