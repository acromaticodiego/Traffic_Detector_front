import { useEffect, useState } from "react";
import { useAuth } from "../../state/auth";
import {
  useUsers,
  type ManagedUser,
  type NewUser,
  type RoleInfo,
} from "../../state/users";
import {
  formatCedula,
  formatLastLogin,
  formatPhone,
  isPlaceholderCedula,
} from "../../lib/users";
import {
  IconAlert,
  IconCheck,
  IconClose,
  IconDiscard,
  IconRefresh,
  IconUsers,
} from "../icons";
import { RowsSkeleton } from "../Skeleton";

const VACIO: NewUser = {
  email: "",
  full_name: "",
  cedula: "",
  phone: "",
  role: "operario",
  password: "",
};

export function AdminView() {
  const items = useUsers((s) => s.items);
  const roles = useUsers((s) => s.roles);
  const loading = useUsers((s) => s.loading);
  const error = useUsers((s) => s.error);
  const load = useUsers((s) => s.load);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="admin section-bg">
      <header className="admin-head">
        <div>
          <h2>Administración</h2>
          <p>Cuentas, roles y permisos</p>
        </div>
        <button className="admin-reload" onClick={() => void load()} disabled={loading}>
          <IconRefresh width={14} height={14} />
          <span>Actualizar</span>
        </button>
      </header>

      {error && (
        <p className="admin-error">
          <IconAlert width={14} height={14} />
          <span>{error}</span>
        </p>
      )}

      <div className="admin-grid">
        <CreateForm />

        <section className="admin-panel">
          <h3>
            Cuentas <span className="admin-count">{items.length}</span>
          </h3>

          {loading && items.length === 0 ? (
            <RowsSkeleton rows={4} />
          ) : (
            <ul className="user-list">
              {items.map((u) => (
                <UserRow key={u.id} user={u} />
              ))}
            </ul>
          )}
        </section>

        <RolesPanel roles={roles} />
      </div>
    </div>
  );
}

function CreateForm() {
  const roles = useUsers((s) => s.roles);
  const crear = useUsers((s) => s.create);
  const saving = useUsers((s) => s.saving);
  const formError = useUsers((s) => s.formError);
  const clearFormError = useUsers((s) => s.clearFormError);

  const [form, setForm] = useState<NewUser>(VACIO);
  const [listo, setListo] = useState<string | null>(null);

  function campo(k: keyof NewUser) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((f) => ({ ...f, [k]: e.target.value }));
      if (formError) clearFormError();
      if (listo) setListo(null);
    };
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;

    const correo = form.email;

    if (await crear(form)) {
      // Se conserva el rol: crear tres operarios seguidos es lo normal, y
      // volver a elegirlo cada vez es fricción sin motivo.
      setForm({ ...VACIO, role: form.role });
      setListo(correo);
    }
  }

  const completo = form.email && form.cedula && form.phone && form.password;

  return (
    <section className="admin-panel">
      <h3>Nueva cuenta</h3>

      <form className="user-form" onSubmit={submit}>
        <label>
          <span>Correo</span>
          <input
            type="email"
            value={form.email}
            onChange={campo("email")}
            placeholder="persona@organizacion.com"
            required
            disabled={saving}
          />
        </label>

        <label>
          <span>Nombre</span>
          <input
            value={form.full_name}
            onChange={campo("full_name")}
            placeholder="Opcional"
            disabled={saving}
          />
        </label>

        <label>
          <span>Cédula</span>
          <input
            value={form.cedula}
            onChange={campo("cedula")}
            placeholder="1.234.567.890"
            inputMode="numeric"
            required
            disabled={saving}
          />
          {/* Se acepta con puntos, espacios o guiones: el servidor guarda solo
              los dígitos. Exigir un formato exacto solo genera errores en un
              dato que la gente escribe de cuatro maneras distintas. */}
          <small>Con puntos o sin ellos, da igual</small>
        </label>

        <label>
          <span>Teléfono</span>
          <input
            value={form.phone}
            onChange={campo("phone")}
            placeholder="300 123 4567"
            inputMode="tel"
            required
            disabled={saving}
          />
        </label>

        <label>
          <span>Rol</span>
          <select value={form.role} onChange={campo("role")} disabled={saving}>
            {roles.map((r) => (
              <option key={r.name} value={r.name}>
                {r.name}
              </option>
            ))}
          </select>
          <small>{roles.find((r) => r.name === form.role)?.description}</small>
        </label>

        <label>
          <span>Contraseña</span>
          <input
            type="password"
            value={form.password}
            onChange={campo("password")}
            placeholder="Mínimo 8 caracteres"
            required
            disabled={saving}
          />
          <small>Se la entregas a la persona; puede cambiarla después</small>
        </label>

        {formError && (
          <p className="admin-error" role="alert">
            <IconAlert width={14} height={14} />
            <span>{formError}</span>
          </p>
        )}

        {listo && (
          <p className="admin-ok" role="status">
            <IconCheck width={14} height={14} />
            <span>Cuenta creada para {listo}</span>
          </p>
        )}

        <button type="submit" disabled={saving || !completo}>
          {saving ? "Creando…" : "Crear cuenta"}
        </button>
      </form>
    </section>
  );
}

function UserRow({ user }: { user: ManagedUser }) {
  const actualizar = useUsers((s) => s.update);
  const roles = useUsers((s) => s.roles);
  const yo = useAuth((s) => s.user);

  const [editando, setEditando] = useState(false);

  // Un administrador no puede degradarse ni apagarse a sí mismo: se quedaría
  // fuera y el sistema sin quien lo arregle. El backend lo rechaza igual;
  // esto evita ofrecer un control que va a fallar.
  const esYo = yo?.id === user.id;
  const pendiente = isPlaceholderCedula(user.cedula);

  if (editando) {
    return <EditRow user={user} onClose={() => setEditando(false)} />;
  }

  return (
    <li className={user.active ? "" : "inactivo"}>
      <span className="user-avatar">
        <IconUsers width={15} height={15} />
      </span>

      <div className="user-main">
        <strong>
          {user.full_name || user.email}
          {esYo && <em> · tú</em>}
        </strong>
        <span>{user.email}</span>
        <span className="user-meta">
          {pendiente ? (
            <button
              className="user-pending"
              onClick={() => setEditando(true)}
              title="Es el relleno que puso la migración. Clic para corregirla."
            >
              <IconAlert width={11} height={11} />
              cédula sin registrar
            </button>
          ) : (
            <>CC {formatCedula(user.cedula)}</>
          )}
        </span>
        <span className="user-meta">Tel {formatPhone(user.phone)}</span>
        <span className="user-meta">
          Último ingreso: {formatLastLogin(user.last_login_at)}
        </span>
      </div>

      <div className="user-actions">
        <select
          value={user.role}
          disabled={esYo}
          onChange={(e) => void actualizar(user.id, { role: e.target.value })}
          title={esYo ? "No puedes cambiarte el rol" : "Cambiar rol"}
        >
          {roles.map((r) => (
            <option key={r.name} value={r.name}>
              {r.name}
            </option>
          ))}
        </select>

        <button
          className={`user-toggle${user.active ? " on" : ""}`}
          disabled={esYo}
          onClick={() => void actualizar(user.id, { active: !user.active })}
          title={
            esYo
              ? "No puedes desactivar tu propia cuenta"
              : user.active
                ? "Desactivar"
                : "Reactivar"
          }
        >
          {user.active ? (
            <IconCheck width={13} height={13} />
          ) : (
            <IconDiscard width={13} height={13} />
          )}
          <span>{user.active ? "Activa" : "Inactiva"}</span>
        </button>

        <button className="user-edit" onClick={() => setEditando(true)}>
          Editar datos
        </button>
      </div>
    </li>
  );
}

/**
 * Edición en línea de una cuenta.
 *
 * Sustituye a la fila en vez de abrir un diálogo: son cuatro campos, y una
 * ventana modal para eso es más ceremonia que ayuda.
 */
function EditRow({ user, onClose }: { user: ManagedUser; onClose: () => void }) {
  const actualizar = useUsers((s) => s.update);

  // La cédula de relleno arranca vacía: pedirle a alguien que borre un
  // 0000000001 antes de escribir la buena es fricción sin motivo.
  const [nombre, setNombre] = useState(user.full_name);
  const [cedula, setCedula] = useState(
    isPlaceholderCedula(user.cedula) ? "" : user.cedula,
  );
  const [telefono, setTelefono] = useState(user.phone);
  const [clave, setClave] = useState("");

  async function guardar(e: React.FormEvent) {
    e.preventDefault();

    // Solo se manda lo que cambió. Reenviar la cédula intacta la haría
    // chocar consigo misma en la comprobación de unicidad del servidor.
    const cambios: Record<string, string> = {};

    if (nombre !== user.full_name) cambios.full_name = nombre;
    if (cedula && cedula !== user.cedula) cambios.cedula = cedula;
    if (telefono !== user.phone) cambios.phone = telefono;
    if (clave) cambios.password = clave;

    if (Object.keys(cambios).length > 0) {
      await actualizar(user.id, cambios);
    }

    onClose();
  }

  return (
    <li className="user-editing">
      <form className="user-form" onSubmit={guardar}>
        <h4>
          Editar {user.email}
          <button type="button" onClick={onClose} title="Cancelar">
            <IconClose width={14} height={14} />
          </button>
        </h4>

        <label>
          <span>Nombre</span>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </label>

        <label>
          <span>Cédula</span>
          <input
            value={cedula}
            onChange={(e) => setCedula(e.target.value)}
            placeholder="1.234.567.890"
            inputMode="numeric"
          />
          <small>Con puntos o sin ellos, da igual</small>
        </label>

        <label>
          <span>Teléfono</span>
          <input
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            placeholder="300 123 4567"
            inputMode="tel"
          />
        </label>

        <label>
          <span>Nueva contraseña</span>
          <input
            type="password"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            placeholder="Dejar vacío para no cambiarla"
          />
        </label>

        <button type="submit">Guardar</button>
      </form>
    </li>
  );
}

function RolesPanel({ roles }: { roles: RoleInfo[] }) {
  return (
    <section className="admin-panel">
      <h3>Qué permite cada rol</h3>

      {/* Se leen de la base, no están escritos aquí: si mañana se agrega un
          permiso a un rol, esta tabla lo refleja sin tocar código. */}
      <ul className="role-list">
        {roles.map((r) => (
          <li key={r.name}>
            <strong>{r.name}</strong>
            <span>{r.description}</span>
            <div className="role-perms">
              {r.permissions.map((p) => (
                <span key={p} className="role-perm">
                  {p}
                </span>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
