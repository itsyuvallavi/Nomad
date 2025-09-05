'use client';

import { Card } from "./ui/card";
import { BrainCircuit, Image as ImageIcon, FileText } from "lucide-react";

const recentChatData = [
  {
    icon: <BrainCircuit className="h-5 w-5 text-foreground" />,
    title: "Brainstorming session",
  },
  {
    icon: <ImageIcon className="h-5 w-5 text-foreground" />,
    title: "Image generation for a new social media campaign",
  },
  {
    icon: <FileText className="h-5 w-5 text-foreground" />,
    title: "Summarize notes from the last meeting",
  }
];


export default function RecentChats() {
    return (
        <div className="w-full mt-12 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
            <h2 className="text-lg font-semibold text-foreground mb-4">Recent</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {recentChatData.map((chat, index) => (
                    <Card key={index} className="p-4 flex flex-col justify-start cursor-pointer hover:bg-secondary/50 transition-colors animate-in fade-in zoom-in-95 h-32" style={{ animationDelay: `${index * 150}ms`}}>
                        <div className="mb-3">{chat.icon}</div>
                        <h3 className="font-semibold text-foreground text-sm">{chat.title}</h3>
                    </Card>
                ))}
            </div>
        </div>
    );
}
