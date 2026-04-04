// src/pages/Users.tsx
import { useEffect, useState } from "react";
import { userApi } from "@/lib/api";
import type { User } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Trash2, UserCircle } from "lucide-react";

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-purple-100 text-purple-800 border-purple-200",
  sorter: "bg-blue-100 text-blue-800 border-blue-200",
  farmer: "bg-green-100 text-green-800 border-green-200",
};

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("all");

  const load = (role?: string) => {
    userApi
      .list(role && role !== "all" ? role : undefined)
      .then((r) => setUsers(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load(filter);
  }, [filter]);

  const deleteUser = async (id: number) => {
    if (!confirm("Delete this user?")) return;
    await userApi.delete(id);
    load(filter);
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {users.length} accounts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={(v) => v && setFilter(v)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              <SelectItem value="farmer">Farmers</SelectItem>
              <SelectItem value="sorter">Sorters</SelectItem>
              <SelectItem value="admin">Admins</SelectItem>
            </SelectContent>
          </Select>

          <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
            <Plus className="w-4 h-4" /> Add User
          </Button>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Account</DialogTitle>
              </DialogHeader>
              <AddUserForm
                onSuccess={() => {
                  setOpen(false);
                  load(filter);
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="space-y-3">
        {users.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground text-sm">
              No users found.
            </CardContent>
          </Card>
        )}
        {users.map((u) => (
          <Card key={u.id} className="hover:shadow-sm transition-shadow">
            <CardContent className="pt-4 pb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <UserCircle className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{u.full_name}</span>
                    <Badge
                      className={`text-xs capitalize ${ROLE_COLORS[u.role]}`}
                      variant="outline"
                    >
                      {u.role}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                  {u.farmer && (
                    <p className="text-xs text-muted-foreground">
                      🌾 {u.farmer.farm_name}
                    </p>
                  )}
                  {u.sorter && (
                    <p className="text-xs text-muted-foreground">
                      📍 {u.sorter.location}
                    </p>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => deleteUser(u.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function AddUserForm({ onSuccess }: { onSuccess: () => void }) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "farmer",
    farm_name: "",
    address: "",
    location: "",
    contact_number: "",
  });
  const [loading, setLoading] = useState(false);
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setLoading(true);
    setErrors({});
    try {
      await userApi.create(form);
      onSuccess();
    } catch (err: any) {
      const e = err?.response?.data?.errors;
      if (e)
        setErrors(
          Object.fromEntries(
            Object.entries(e).map(([k, v]) => [k, (v as string[])[0]]),
          ),
        );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3 mt-2">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5 col-span-2">
          <Label>Full Name</Label>
          <Input
            value={form.full_name}
            onChange={(e) => set("full_name", e.target.value)}
          />
          {errors.full_name && (
            <p className="text-xs text-destructive">{errors.full_name}</p>
          )}
        </div>
        <div className="space-y-1.5 col-span-2">
          <Label>Email</Label>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email}</p>
          )}
        </div>
        <div className="space-y-1.5 col-span-2">
          <Label>Password</Label>
          <Input
            type="password"
            value={form.password}
            onChange={(e) => set("password", e.target.value)}
          />
          {errors.password && (
            <p className="text-xs text-destructive">{errors.password}</p>
          )}
        </div>
        <div className="space-y-1.5 col-span-2">
          <Label>Role</Label>
          <Select value={form.role} onValueChange={(v) => v && set("role", v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="farmer">Farmer</SelectItem>
              <SelectItem value="sorter">Sorter</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {form.role === "farmer" && (
          <>
            <div className="space-y-1.5 col-span-2">
              <Label>Farm Name</Label>
              <Input
                value={form.farm_name}
                onChange={(e) => set("farm_name", e.target.value)}
              />
              {errors.farm_name && (
                <p className="text-xs text-destructive">{errors.farm_name}</p>
              )}
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Address</Label>
              <Input
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
              />
              {errors.address && (
                <p className="text-xs text-destructive">{errors.address}</p>
              )}
            </div>
          </>
        )}
        {form.role === "sorter" && (
          <div className="space-y-1.5 col-span-2">
            <Label>Location</Label>
            <Input
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
            />
            {errors.location && (
              <p className="text-xs text-destructive">{errors.location}</p>
            )}
          </div>
        )}
        <div className="space-y-1.5 col-span-2">
          <Label>Contact Number (optional)</Label>
          <Input
            value={form.contact_number}
            onChange={(e) => set("contact_number", e.target.value)}
          />
          {errors.contact_number && (
            <p className="text-xs text-destructive">{errors.contact_number}</p>
          )}
        </div>
      </div>
      <Button className="w-full mt-1" onClick={submit} disabled={loading}>
        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        Create Account
      </Button>
    </div>
  );
}
