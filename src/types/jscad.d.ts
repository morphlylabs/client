declare module '@jscad/stl-serializer' {
  export function serialize(geometry: any, options?: { binary?: boolean }): Buffer;
}

declare module '@jscad/modeling' {
  export const primitives: any;
  export const booleans: any;
  export const transforms: any;
  export const geometries: any;
} 