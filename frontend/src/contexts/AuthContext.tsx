
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export interface AuthUser {
  id: number;
  full_name: string;
  email: string;
  role: "ADMIN" | "MAINTENANCE_MANAGER" | "TECHNICIAN" | string;
  is_active: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = "access_token";

async function readError(response: Response): Promise<string> {
  try {
    const data = await response.json();
    return data.detail || data.message || "Une erreur est survenue.";
  } catch {
    return `Erreur HTTP ${response.status}`;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }, []);

  const loadCurrentUser = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);

    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Session invalide ou expirée.");
      }

      const currentUser: AuthUser = await response.json();

      if (!currentUser.is_active) {
        throw new Error("Ce compte est désactivé.");
      }

      setUser(currentUser);
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCurrentUser();
  }, [loadCurrentUser]);

  const login = async (email: string, password: string) => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        password,
      }),
    });

    if (!response.ok) {
      throw new Error(await readError(response));
    }

    const data: { access_token: string; token_type: string } =
      await response.json();

    if (!data.access_token) {
      throw new Error("Le serveur n'a pas retourné de token.");
    }

    localStorage.setItem(TOKEN_KEY, data.access_token);

    try {
      const userResponse = await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${data.access_token}`,
        },
      });

      if (!userResponse.ok) {
        throw new Error(await readError(userResponse));
      }

      const currentUser: AuthUser = await userResponse.json();

      if (!currentUser.is_active) {
        throw new Error("Ce compte est désactivé.");
      }

      setUser(currentUser);
    } catch (error) {
      localStorage.removeItem(TOKEN_KEY);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth doit être utilisé dans AuthProvider.");
  }

  return context;
}
