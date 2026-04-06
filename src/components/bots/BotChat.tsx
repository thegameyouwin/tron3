import { useState, useRef, useEffect } from "react";
import { Bot, MessageSquare, Send, X } from "lucide-react";
import { ChatMessage } from "./types";

interface BotChatProps {
  messages: ChatMessage[];
  onSend: (msg: string) => void;
}

export default function BotChat({ messages, onSend }: BotChatProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && endRef.current) endRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const handleSend = () => {
    const msg = input.trim();
    if (!msg) return;
    onSend(msg);
    setInput("");
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 bg-primary text-primary-foreground rounded-full p-3 shadow-lg z-40 hover:scale-105 transition-transform"
      >
        <MessageSquare className="h-5 w-5" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-80 h-96 bg-card border rounded-xl shadow-2xl flex flex-col z-40">
      <div className="flex justify-between px-4 py-2 border-b">
        <span className="text-sm font-semibold flex gap-2"><Bot className="h-4 w-4" /> Bot Chat</span>
        <button onClick={() => setOpen(false)}><X className="h-4 w-4" /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.slice().reverse().map((msg) => (
          <div key={msg.id} className={`text-xs ${msg.type === "user" ? "text-right" : "text-left"}`}>
            <span className={`inline-block px-2 py-1 rounded-lg max-w-[85%] ${
              msg.type === "user" ? "bg-primary text-primary-foreground" :
              msg.type === "system" ? "bg-secondary text-muted-foreground" :
              "bg-secondary text-foreground"
            }`}>
              {msg.text}
            </span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="px-3 pb-3">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type /help..."
            className="flex-1 text-xs px-3 py-2 rounded-lg bg-secondary border border-border focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button onClick={handleSend} className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90">
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
