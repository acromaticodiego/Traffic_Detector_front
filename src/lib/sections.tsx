/**
 * Las secciones de la aplicación, en un solo sitio.
 *
 * Añadir una sección es añadir una entrada aquí: la barra lateral la dibuja y
 * el armazón la enruta sin tocar ninguno de los dos. Es deliberado — la lista
 * va a crecer, y una navegación que hay que editar en tres archivos por cada
 * pantalla nueva termina desincronizada.
 *
 * `permission` es el código que exige el backend para lo que hay dentro. No
 * es la defensa: quien decide es la API, que lo vuelve a comprobar en cada
 * petición. Aquí solo evita ofrecer una puerta que va a responder 403.
 */

import { IconDashboard, IconConsole, IconUsers } from "../components/icons";
import type { SectionId } from "../state/view";

export interface Section {
  id: SectionId;
  label: string;
  /** Una línea bajo el título de la sección. */
  hint: string;
  icon: JSX.Element;
  /** Sin permiso, la sección es para todo el mundo. */
  permission?: string;
}

export const SECTIONS: Section[] = [
  {
    id: "console",
    label: "Interfaz",
    hint: "Cámara en vivo, incidentes y revisión",
    icon: <IconConsole width={17} height={17} />,
  },
  {
    id: "dashboard",
    label: "Dashboard",
    hint: "Tu turno y tus registros",
    icon: <IconDashboard width={17} height={17} />,
  },
  {
    id: "admin",
    label: "Administración",
    hint: "Usuarios, roles y permisos",
    icon: <IconUsers width={17} height={17} />,
    permission: "users:manage",
  },
];

/** Las secciones que este rol puede abrir, en el orden del registro. */
export function visibleSections(can: (permission: string) => boolean): Section[] {
  return SECTIONS.filter((s) => !s.permission || can(s.permission));
}

/**
 * La sección a la que hay que ir de verdad.
 *
 * Si la guardada ya no está permitida —cambió el rol, o alguien manipuló el
 * `localStorage`— se cae a la primera disponible en vez de dejar la pantalla
 * en blanco. Siempre hay una: "Interfaz" no pide permiso.
 */
export function resolveSection(
  wanted: SectionId,
  can: (permission: string) => boolean,
): SectionId {
  const allowed = visibleSections(can);
  return allowed.some((s) => s.id === wanted) ? wanted : allowed[0].id;
}
