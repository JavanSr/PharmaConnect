"use client";

import { useActionState } from "react";
import { loginAction, type LoginActionState } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState: LoginActionState = {};

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initialState);

  return (
    <form action={action} className="space-y-5">
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700" htmlFor="email">
          Email
        </label>
        <Input id="email" name="email" type="email" placeholder="admin@pharmaconnect.tz" required />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700" htmlFor="password">
          Password
        </label>
        <Input id="password" name="password" type="password" placeholder="Demo123!" required />
      </div>
      {state.error ? <p className="text-sm text-[var(--color-danger)]">{state.error}</p> : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Signing in..." : "Access PharmaConnect"}
      </Button>
    </form>
  );
}
