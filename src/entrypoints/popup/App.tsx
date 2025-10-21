import { useState } from "react";
import reactLogo from "@/assets/react.svg";
import wxtLogo from "@/assets/wxt.svg";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { APP_NAME } from "@/constants";

export const App = () => {
  const [count, setCount] = useState(0);

  return (
    <Card
      className="w-full min-w-2xl h-full border-2 rounded-none shadow-none gap-0"
      role="region"
      aria-label="App content"
    >
      <CardHeader className="flex flex-col items-center justify-center">
        <div className="flex gap-2">
          <h1 className="text-lg font-bold text-primary" test-id="app-title">
            {APP_NAME}
          </h1>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center">
        <div className="flex gap-2">
          <a
            href="https://wxt.dev"
            target="_blank"
            rel="noreferrer"
            className="relative group block rounded-full"
          >
            <div className="absolute inset-0 rounded-full transition-all duration-300 group-hover:bg-[#54bc4a]/30 dark:group-hover:bg-[#54bc4a]/40 blur-md"></div>
            <img
              src={wxtLogo}
              className="h-24 p-3 inline-block relative transition-all duration-300"
              alt="WXT logo"
            />
          </a>
          <a
            href="https://react.dev"
            target="_blank"
            rel="noreferrer"
            className="group relative block rounded-full"
          >
            <div className="absolute inset-0 rounded-full transition-all duration-300 group-hover:bg-[#61dafb]/30 dark:group-hover:bg-[#61dafb]/40 blur-md"></div>
            <img
              src={reactLogo}
              className="h-24 p-3 inline-block relative transition-all duration-300 group-[.group]:animate-[spin_20s_linear_infinite]"
              alt="React logo"
            />
          </a>
        </div>
        <div className="py-2">
          <Button
            onClick={() => setCount((count) => count + 1)}
            size="sm"
            aria-label="Increment counter"
          >
            count is {count}
          </Button>
        </div>
      </CardContent>
      <CardFooter
        className="mt-auto flex flex-col items-center"
        role="contentinfo"
      >
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Edit{" "}
          <code className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">
            src/app/app.tsx
          </code>{" "}
          <br />
          and save to test HMR
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Click on the WXT and React logos to learn more
        </p>
      </CardFooter>
    </Card>
  );
};
