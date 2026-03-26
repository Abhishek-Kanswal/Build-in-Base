"use client";

import { createClient } from "@/lib/supabase/client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  SlidersHorizontal,
  ArrowUp,
  Figma,
  Camera,
  CirclePlus,
  Clipboard,
  Upload,
  History,
  LayoutDashboard,
  Link,
  Paperclip,
  Play,
  Plus,
  Sparkles,
  FileText,
  X,
  ChevronDown,
  Loader2,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Dock, DockIcon } from "@/components/dock"


const dockItems = [
  {
    src: "https://cdn.badtz-ui.com/images/components/dock/tailwindcss-logo.webp",
    name: "TailwindCSS",
    href: "#tailwindcss",
  },
  {
    src: "https://cdn.badtz-ui.com/images/components/dock/edge-logo.webp",
    name: "Edge",
    href: "#linear",
  },
  {
    src: "https://cdn.badtz-ui.com/images/components/dock/motion-logo.webp",
    name: "Motion",
    href: "#motion",
  },
  {
    src: "https://cdn.badtz-ui.com/images/components/dock/react-logo.webp",
    name: "React",
    href: "#react",
  },
  {
    src: "https://cdn.badtz-ui.com/images/components/dock/linear-logo.webp",
    name: "Linear",
    href: "#linear",
  },
  {
    src: "https://cdn.badtz-ui.com/images/components/dock/drizzle-orm-logo.webp",
    name: "Drizzle ORM",
    href: "#drizzle-orm",
  },
  {
    src: "https://cdn.badtz-ui.com/images/components/dock/deepseek-logo.webp",
    name: "Deepseek",
    href: "#linear",
  },
]

// --- Animated Placeholder Hook ---
const useTypingEffect = (phrases: string[], typingSpeed = 50, deletingSpeed = 30, pauseDuration = 2000) => {
  const [text, setText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [loopNum, setLoopNum] = useState(0);
  const [typingDelay, setTypingDelay] = useState(typingSpeed);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    const handleTyping = () => {
      const currentPhraseIndex = loopNum % phrases.length;
      const fullText = phrases[currentPhraseIndex];

      setText((prevText) => {
        if (isDeleting) {
          return fullText.substring(0, prevText.length - 1);
        }
        return fullText.substring(0, prevText.length + 1);
      });

      setTypingDelay(isDeleting ? deletingSpeed : typingSpeed);

      if (!isDeleting && text === fullText) {
        // Pause at the end of typing
        timer = setTimeout(() => setIsDeleting(true), pauseDuration);
      } else if (isDeleting && text === "") {
        // Move to next phrase
        setIsDeleting(false);
        setLoopNum(loopNum + 1);
        setTypingDelay(500); // Small pause before starting next word
      } else {
        // Continue typing/deleting
        timer = setTimeout(handleTyping, typingDelay);
      }
    };

    timer = setTimeout(handleTyping, typingDelay);

    return () => clearTimeout(timer);
  }, [text, isDeleting, loopNum, typingDelay, phrases, typingSpeed, deletingSpeed, pauseDuration]);

  return text;
};

interface AttachedFile {
  id: string;
  name: string;
  file: File;
  preview?: string;
}

const ACTIONS = [
  { id: "clone-screenshot", icon: Camera, label: "Clone a Screenshot" },
  { id: "import-figma", icon: Figma, label: "Import from Figma" },
  { id: "upload-project", icon: Upload, label: "Upload a Project" },
  { id: "landing-page", icon: LayoutDashboard, label: "Landing Page" },
];

const CHAINS = [
  { id: "eth", name: "Ethereum", icon: "/eth.svg" },
  { id: "base", name: "Base", icon: "/base.svg" },
  { id: "solana", name: "Solana", icon: "/sol.svg" },
];

const PLACEHOLDER_PHRASES = [
  "Ask anything...",
  "Describe the UI you want to build...",
  "Upload a wireframe to get started...",
  "What are we shipping today?",
];

export default function ChatInput({
  onSubmit,
}: {
  onSubmit?: (prompt: string, chainId: string) => void;
}) {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [selectedChain, setSelectedChain] = useState(CHAINS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize the typing effect
  const animatedPlaceholder = useTypingEffect(PLACEHOLDER_PHRASES);

  const [settings, setSettings] = useState({
    autoComplete: true,
    streaming: false,
    showHistory: false,
  });

  const generateFileId = () => Math.random().toString(36).substring(7);
  const processFiles = (files: File[]) => {
    for (const file of files) {
      const fileId = generateFileId();
      const attachedFile: AttachedFile = {
        id: fileId,
        name: file.name,
        file,
      };

      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = () => {
          setAttachedFiles((prev) =>
            prev.map((f) =>
              f.id === fileId ? { ...f, preview: reader.result as string } : f
            )
          );
        };
        reader.readAsDataURL(file);
      }

      setAttachedFiles((prev) => [...prev, attachedFile]);
    }
  };

  const submitPrompt = async () => {
    if (!prompt.trim() || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const supabase = createClient();

      // 1. Verify auth first (security)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error("Not authenticated");
        setIsSubmitting(false);
        return;
      }

      // 2. Generate UUID client-side for instant navigation
      const projectId = crypto.randomUUID();
      const trimmedPrompt = prompt.trim();
      const tempTitle = trimmedPrompt.length > 50
        ? trimmedPrompt.substring(0, 50) + "..."
        : trimmedPrompt;

      // 3. Navigate immediately (optimistic)
      router.push(`/project/${projectId}`);

      // 4. Fire DB inserts in background (non-blocking)
      supabase
        .from("projects")
        .insert({
          id: projectId,
          user_id: user.id,
          title: tempTitle,
          chain_id: selectedChain.id,
        })
        .then(({ error: projectError }) => {
          if (projectError) {
            console.error("Failed to create project:", projectError);
            return;
          }

          // Insert initial message
          supabase
            .from("messages")
            .insert({
              project_id: projectId,
              user_id: user.id,
              role: "user",
              content: trimmedPrompt,
            })
            .then(({ error: msgError }) => {
              if (msgError) console.error("Failed to create message:", msgError);
            });

          // 5. Generate smart AI title in background via /api/chat
          fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              messages: [
                {
                  role: "user",
                  content: `Generate a short project title (max 5 words, no quotes) for this prompt: "${trimmedPrompt}"`,
                },
              ],
            }),
          })
            .then((res) => res.json())
            .then(({ response: aiTitle }) => {
              if (aiTitle) {
                const cleanTitle = aiTitle.replace(/['"]/g, "").trim().substring(0, 60);
                supabase
                  .from("projects")
                  .update({ title: cleanTitle })
                  .eq("id", projectId)
                  .then(({ error }) => {
                    if (error) console.error("Failed to update title:", error);
                  });
              }
            })
            .catch((err) => console.error("Title generation failed:", err));
        });
    } catch (error) {
      console.error("Error creating project:", error);
      setIsSubmitting(false);
    }
  };

  const updateSetting = (key: keyof typeof settings, value: boolean) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitPrompt();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      processFiles(files);
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submitPrompt();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    processFiles(files);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveFile = (fileId: string) => {
    setAttachedFiles((prev) => prev.filter((file) => file.id !== fileId));
  };

  return (
    <div className="mx-auto flex w-full flex-col gap-6">
      <h1 className="text-pretty text-center font-heading font-semibold text-[29px] text-foreground tracking-tighter sm:text-[32px] md:text-[46px]">
        Prompt. Refine. Ship.
      </h1>
      <h2 className="-my-5 pb-6 text-center text-lg md:text-xl text-muted-foreground px-4 md:px-0">
        Build real, working software just by describing it
      </h2>

      <div className="relative z-10 flex flex-col w-full mx-auto max-w-3xl content-center">

        {/* --- ANIMATED BORDER WRAPPER --- */}
        <div className="relative overflow-hidden rounded-2xl p-[2px] transition-all duration-200 focus-within:shadow-md group">

          {/* THE SPINNING WHITE LASER */}
          <div className="absolute inset-[-100%] animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,transparent_70%,white_100%)] opacity-80" />

          {/* THE MASK (YOUR FORM) */}
          <form
            className="relative z-10 w-full h-full overflow-visible rounded-xl bg-[#0A0A0A] p-3"
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onSubmit={handleSubmit}
          >
            {attachedFiles.length > 0 && (
              <div className="relative flex w-fit items-center gap-2 mb-3 overflow-hidden">
                {attachedFiles.map((file) => (
                  <Badge
                    variant="outline"
                    className="group/badge relative h-8 max-w-30 cursor-pointer overflow-hidden text-sm transition-colors hover:bg-accent px-0"
                    key={file.id}
                  >
                    <span className="flex h-full items-center gap-2 overflow-hidden pl-2 font-normal">
                      <div className="relative flex h-5 min-w-5 items-center justify-center">
                        {file.preview ? (
                          <Image
                            alt={file.name}
                            className="absolute inset-0 h-5 w-5 rounded border object-cover"
                            src={file.preview}
                            width={20}
                            height={20}
                          />
                        ) : (
                          <Paperclip className="opacity-60" size={16} />
                        )}
                      </div>
                      <span className="inline overflow-hidden truncate pr-2 transition-all">
                        {file.name}
                      </span>
                    </span>
                    <button
                      className="absolute right-1.5 z-10 rounded-sm p-1 text-muted-foreground opacity-0 focus-visible:bg-accent focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-background group-hover/badge:opacity-100"
                      onClick={() => handleRemoveFile(file.id)}
                      type="button"
                    >
                      <X size={16} />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <Textarea
              className="max-h-48 min-h-14 resize-none rounded-none border-none bg-transparent! p-0 text-base md:text-lg font-medium leading-relaxed shadow-none placeholder:text-muted-foreground/70 focus-visible:border-transparent focus-visible:ring-0"
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder={animatedPlaceholder}
              value={prompt}
            />

            <div className="flex items-center gap-2 mt-2">
              <div className="flex items-center gap-1">
                <input
                  className="sr-only"
                  multiple
                  onChange={handleFileSelect}
                  ref={fileInputRef}
                  type="file"
                />

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      className="h-11 w-11 rounded-lg focus-visible:ring-0 focus-visible:ring-transparent focus-visible:ring-offset-0"
                      size="icon"
                      type="button"
                      variant="ghost"
                    >
                      <Plus className="!w-5 !h-5" strokeWidth={2} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    className="max-w-xs rounded-2xl p-2"
                  >
                    <DropdownMenuGroup className="space-y-1">
                      <DropdownMenuItem
                        className="rounded-xl text-sm py-2.5 cursor-pointer"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <div className="flex items-center gap-3">
                          <Paperclip className="text-muted-foreground" size={24} strokeWidth={2} />
                          <span>Attach Files</span>
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="rounded-xl text-sm py-2.5 cursor-pointer">
                        <div className="flex items-center gap-3">
                          <Link className="text-muted-foreground" size={24} strokeWidth={2} />
                          <span>Import from URL</span>
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="rounded-xl text-sm py-2.5 cursor-pointer">
                        <div className="flex items-center gap-3">
                          <Clipboard className="text-muted-foreground" size={24} strokeWidth={2} />
                          <span>Paste from Clipboard</span>
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="rounded-xl text-sm py-2.5 cursor-pointer">
                        <div className="flex items-center gap-3">
                          <FileText className="text-muted-foreground" size={24} strokeWidth={2} />
                          <span>Use Template</span>
                        </div>
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      className="h-11 w-11 rounded-lg focus-visible:ring-0 focus-visible:ring-transparent focus-visible:ring-offset-0"
                      size="icon"
                      type="button"
                      variant="ghost"
                    >
                      <SlidersHorizontal className="!w-5 !h-5" strokeWidth={2} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    className="w-52 rounded-2xl p-4"
                  >
                    <DropdownMenuGroup className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Sparkles className="text-muted-foreground" size={20} strokeWidth={2} />
                          <Label className="text-sm">Auto-complete</Label>
                        </div>
                        <Switch
                          checked={settings.autoComplete}
                          className="scale-90"
                          onCheckedChange={(value) =>
                            updateSetting("autoComplete", value)
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Play className="text-muted-foreground" size={20} strokeWidth={2} />
                          <Label className="text-sm">Streaming</Label>
                        </div>
                        <Switch
                          checked={settings.streaming}
                          className="scale-90"
                          onCheckedChange={(value) =>
                            updateSetting("streaming", value)
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <History className="text-muted-foreground" size={20} strokeWidth={2} />
                          <Label className="text-sm">Show History</Label>
                        </div>
                        <Switch
                          checked={settings.showHistory}
                          className="scale-90"
                          onCheckedChange={(value) =>
                            updateSetting("showHistory", value)
                          }
                        />
                      </div>
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Chain Selector */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      className="h-11 rounded-lg px-2 ml-1 text-muted-foreground hover:text-foreground flex items-center gap-2 transition-colors focus-visible:ring-0 focus-visible:ring-transparent focus-visible:ring-offset-0"
                      type="button"
                      variant="ghost"
                    >
                      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-muted/80 border border-border text-foreground shadow-sm">
                        <Image
                          src={selectedChain.icon}
                          alt={selectedChain.name}
                          width={14}
                          height={14}
                          className="object-contain"
                        />
                      </div>
                      <ChevronDown className="!w-4 !h-4 opacity-50" strokeWidth={2} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-40 rounded-xl p-2">
                    <DropdownMenuGroup className="space-y-1">
                      {CHAINS.map((chain) => (
                        <DropdownMenuItem
                          key={chain.id}
                          className="rounded-lg text-sm py-2 cursor-pointer font-medium flex items-center gap-3"
                          onClick={() => setSelectedChain(chain)}
                        >
                          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-muted/80 border border-border/50 text-foreground">
                            <Image
                              src={chain.icon}
                              alt={chain.name}
                              width={14}
                              height={14}
                              className="object-contain"
                            />
                          </div>
                          {chain.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="ml-auto flex items-center gap-1">
                <Button
                  className="h-12 w-12 rounded-xl p-0 focus-visible:ring-2 focus-visible:ring-offset-2"
                  disabled={!prompt.trim() || isSubmitting}
                  type="submit"
                  variant="default"
                >
                  <span className="flex items-center justify-center">
                    {isSubmitting ? (
                      <Loader2 className="!w-4 !h-4 animate-spin" />
                    ) : (
                      <ArrowUp className="!w-4 !h-4" strokeWidth={3} />
                    )}
                  </span>
                </Button>
              </div>
            </div>

            <div
              className={cn(
                "absolute inset-0 flex items-center justify-center pointer-events-none z-20 rounded-[inherit] border-2 border-border border-dashed bg-muted text-foreground text-base transition-opacity duration-200",
                isDragOver ? "opacity-100" : "opacity-0"
              )}
            >
              <span className="flex w-full items-center justify-center gap-2 font-medium">
                <CirclePlus className="min-w-5" size={22} />
                Drop files here to add as attachments
              </span>
            </div>
          </form>
        </div>
        <div className="mt-4 flex w-full px-2 justify-start items-center">
          <Dock>
            {dockItems.map((item, index) => (
              <DockIcon
                key={index}
                src={item.src}
                name={item.name}
                href={item.href}
              />
            ))}
          </Dock>
        </div>
      </div>
    </div>
  );
}