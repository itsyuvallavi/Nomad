'use client';

import { Card } from "./ui/card";
import { BrainCircuit, Image as ImageIcon, FileText } from "lucide-react";

const recentChatData = [
  {
    icon: <BrainCircuit className="h-6 w-6 text-foreground" />,
    title: "Brainstorming session",
    subtitle: "Used Synapse 0.11"
  },
  {
    icon: <ImageIcon className="h-6 w-6 text-foreground" />,
    title: "Image generation for a new social media campaign",
    subtitle: "Used Gemini Pro"
  },
  {
    icon: <FileText className="h-6 w-6 text-foreground" />,
    title: "Summarize notes from the last meeting",
    subtitle: "Used Synapse 0.11"
  }
];


export default function RecentChats() {
    return (
        <div className="w-full mt-12">
            <h2 className="text-lg font-semibold text-foreground mb-4">Recent</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {recentChatData.map((chat, index) => (
                    <Card key={index} className="p-4 flex flex-col justify-between cursor-pointer hover:bg-secondary/50 transition-colors">
                        <div>
                            <div className="mb-4">{chat.icon}</div>
                            <h3 className="font-semibold text-foreground">{chat.title}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">{chat.subtitle}</p>
                    </Card>
                ))}
            </div>
        </div>
    );
}
