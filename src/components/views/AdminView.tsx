import { Placeholder } from "./Placeholder";

export function AdminView() {
  return (
    <Placeholder title="Administración">
      Aquí se crearán las cuentas y se les asignará rol. Por ahora las cuentas
      se crean desde el servidor, con scripts/create_user.py.
    </Placeholder>
  );
}
