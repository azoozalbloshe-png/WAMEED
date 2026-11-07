import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { platform } from "../services/platform";
import { useAuth } from "./AuthContext";
type Policies = Record<string, Record<string, boolean>>;
const Context = createContext<{
  permissions: Policies;
  loading: boolean;
  can: (r: string, a?: string) => boolean;
}>({ permissions: {}, loading: true, can: () => false });
export function PermissionsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<Policies>({}),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    let live = true;
    setPermissions({});
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    platform
      .permissions()
      .then((p) => {
        if (live) setPermissions(p);
      })
      .catch(() => {
        if (live) setPermissions({});
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [user?.id, user?.role]);
  return (
    <Context.Provider
      value={{
        permissions,
        loading,
        can: (r, a = "read") => permissions[r]?.[a] === true,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const usePermissions = () => useContext(Context);
