import dynamic from "next/dynamic";

const SpaClient = dynamic(() => import("./spa-client"), { ssr: false });

export default function Page() {
  return <SpaClient />;
}
