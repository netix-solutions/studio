'use client';

import { useEditor, EditorContent, type Editor, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import TextStyle from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo,
  Redo,
  Link as LinkIcon,
  Unlink,
  Image as ImageIcon,
  Palette,
  Highlighter,
  Type,
  ChevronDown,
  Square,
  RectangleHorizontal,
  Info,
  CheckCircle,
  AlertTriangle,
  Minus,
  MoreHorizontal,
  Quote,
} from 'lucide-react';
import { Toggle } from '@/components/ui/toggle';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCallback, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

// Email-specific style presets (matches website primary: HSL 217 65% 28%)
const emailColors = [
  { name: 'Default', value: '#3f3f46' },
  { name: 'Primary', value: '#1e3a5f' },
  { name: 'Success', value: '#166534' },
  { name: 'Warning', value: '#854d0e' },
  { name: 'Danger', value: '#dc2626' },
  { name: 'Muted', value: '#71717a' },
];

const highlightColors = [
  { name: 'Yellow', value: '#fef08a' },
  { name: 'Green', value: '#bbf7d0' },
  { name: 'Blue', value: '#bfdbfe' },
  { name: 'Pink', value: '#fbcfe8' },
  { name: 'Orange', value: '#fed7aa' },
];

// Email component templates
const emailComponents = {
  primaryButton: `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 16px 0;">
    <tr>
      <td style="border-radius: 6px;" bgcolor="#1e3a5f">
        <a href="#" target="_blank" style="display: inline-block; padding: 14px 28px; background-color: #1e3a5f; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
          Button Text
        </a>
      </td>
    </tr>
  </table>`,
  secondaryButton: `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 16px 0;">
    <tr>
      <td style="border-radius: 6px; border: 1px solid #e4e4e7;" bgcolor="#f4f4f5">
        <a href="#" target="_blank" style="display: inline-block; padding: 14px 28px; background-color: #f4f4f5; color: #3f3f46; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
          Button Text
        </a>
      </td>
    </tr>
  </table>`,
  infoBox: `<div style="margin: 24px 0; padding: 20px; background-color: #f1f5f9; border-radius: 8px; border: 1px solid #cbd5e1;">
    <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #1e3a5f;">Info Title</p>
    <p style="margin: 0; font-size: 15px; color: #334155;">Your information text here.</p>
  </div>`,
  successBox: `<div style="margin: 24px 0; padding: 20px; background-color: #f0fdf4; border-radius: 8px; border: 1px solid #86efac;">
    <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #166534;">Success Title</p>
    <p style="margin: 0; font-size: 15px; color: #166534;">Your success message here.</p>
  </div>`,
  warningBox: `<div style="margin: 24px 0; padding: 20px; background-color: #fefce8; border-radius: 8px; border: 1px solid #fde047;">
    <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #854d0e;">Warning Title</p>
    <p style="margin: 0; font-size: 15px; color: #854d0e;">Your warning message here.</p>
  </div>`,
  divider: `<hr style="border: none; border-top: 1px solid #e4e4e7; margin: 24px 0;" />`,
  signature: `<div style="margin: 24px 0 0 0; padding-top: 24px; border-top: 1px solid #e4e4e7;">
    <p style="margin: 0; font-size: 16px; color: #3f3f46;">Best regards,</p>
    <p style="margin: 4px 0 0 0; font-size: 16px; font-weight: 600; color: #18181b;">The Community-Websites.com Team</p>
  </div>`,
  featureBlock: `<div style="margin: 0 0 16px 0; padding: 16px 20px; background-color: #f8fafc; border-left: 4px solid #1e3a5f; border-radius: 0 6px 6px 0;">
    <p style="margin: 0 0 4px 0; font-size: 16px; font-weight: 600; color: #18181b;">Feature Title</p>
    <p style="margin: 0; font-size: 15px; color: #64748b;">Feature description here.</p>
  </div>`,
  codeBlock: `<div style="margin: 24px 0; padding: 16px 20px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;">
    <code style="font-family: monospace; font-size: 14px; color: #334155;">CODE_HERE</code>
  </div>`,
};

interface ToolbarProps {
  editor: Editor | null;
  placeholders?: { key: string; description: string }[];
  showPlaceholders?: boolean;
}

const Toolbar = ({ editor, placeholders = [], showPlaceholders = true }: ToolbarProps) => {
  const [linkUrl, setLinkUrl] = useState('');
  const [linkOpen, setLinkOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [imageOpen, setImageOpen] = useState(false);

  const setLink = useCallback(() => {
    if (!editor || !linkUrl) return;
    editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
    setLinkUrl('');
    setLinkOpen(false);
  }, [editor, linkUrl]);

  const removeLink = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().unsetLink().run();
  }, [editor]);

  const addImage = useCallback(() => {
    if (!editor || !imageUrl) return;
    editor.chain().focus().setImage({ src: imageUrl }).run();
    setImageUrl('');
    setImageOpen(false);
  }, [editor, imageUrl]);

  const insertEmailComponent = useCallback((html: string) => {
    if (!editor) return;
    editor.chain().focus().insertContent(html).run();
  }, [editor]);

  const insertPlaceholder = useCallback((placeholder: string) => {
    if (!editor) return;
    editor.chain().focus().insertContent(placeholder).run();
  }, [editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className="border border-input rounded-md bg-muted/30">
      {/* Main Toolbar Row */}
      <div className="p-2 flex items-center flex-wrap gap-1">
        {/* Text Formatting */}
        <Toggle
          size="sm"
          pressed={editor.isActive('bold')}
          onPressedChange={() => editor.chain().focus().toggleBold().run()}
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('italic')}
          onPressedChange={() => editor.chain().focus().toggleItalic().run()}
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('underline')}
          onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
          title="Underline"
        >
          <UnderlineIcon className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('strike')}
          onPressedChange={() => editor.chain().focus().toggleStrike().run()}
          title="Strikethrough"
        >
          <Strikethrough className="h-4 w-4" />
        </Toggle>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Headings Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 px-2 gap-1">
              <Type className="h-4 w-4" />
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => editor.chain().focus().setParagraph().run()}>
              <span className="text-sm">Normal text</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
              <span className="text-xl font-bold">Heading 1</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
              <span className="text-lg font-bold">Heading 2</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
              <span className="text-base font-bold">Heading 3</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Text Color */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 px-2 gap-1" title="Text Color">
              <Palette className="h-4 w-4" />
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Text Color</DropdownMenuLabel>
            {emailColors.map((color) => (
              <DropdownMenuItem
                key={color.value}
                onClick={() => editor.chain().focus().setColor(color.value).run()}
              >
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: color.value }} />
                  {color.name}
                </div>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => editor.chain().focus().unsetColor().run()}>
              Remove color
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Highlight */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 px-2 gap-1" title="Highlight">
              <Highlighter className="h-4 w-4" />
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Highlight</DropdownMenuLabel>
            {highlightColors.map((color) => (
              <DropdownMenuItem
                key={color.value}
                onClick={() => editor.chain().focus().toggleHighlight({ color: color.value }).run()}
              >
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: color.value }} />
                  {color.name}
                </div>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => editor.chain().focus().unsetHighlight().run()}>
              Remove highlight
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Alignment */}
        <Toggle
          size="sm"
          pressed={editor.isActive({ textAlign: 'left' })}
          onPressedChange={() => editor.chain().focus().setTextAlign('left').run()}
          title="Align Left"
        >
          <AlignLeft className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive({ textAlign: 'center' })}
          onPressedChange={() => editor.chain().focus().setTextAlign('center').run()}
          title="Align Center"
        >
          <AlignCenter className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive({ textAlign: 'right' })}
          onPressedChange={() => editor.chain().focus().setTextAlign('right').run()}
          title="Align Right"
        >
          <AlignRight className="h-4 w-4" />
        </Toggle>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Lists */}
        <Toggle
          size="sm"
          pressed={editor.isActive('bulletList')}
          onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('orderedList')}
          onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
          title="Numbered List"
        >
          <ListOrdered className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('blockquote')}
          onPressedChange={() => editor.chain().focus().toggleBlockquote().run()}
          title="Quote"
        >
          <Quote className="h-4 w-4" />
        </Toggle>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Link */}
        <Popover open={linkOpen} onOpenChange={setLinkOpen}>
          <PopoverTrigger asChild>
            <Toggle
              size="sm"
              pressed={editor.isActive('link')}
              title="Add Link"
            >
              <LinkIcon className="h-4 w-4" />
            </Toggle>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-3">
              <Label>Link URL</Label>
              <Input
                placeholder="https://example.com"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && setLink()}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={setLink}>Add Link</Button>
                {editor.isActive('link') && (
                  <Button size="sm" variant="destructive" onClick={removeLink}>
                    <Unlink className="h-4 w-4 mr-1" /> Remove
                  </Button>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Image */}
        <Popover open={imageOpen} onOpenChange={setImageOpen}>
          <PopoverTrigger asChild>
            <Toggle size="sm" title="Add Image">
              <ImageIcon className="h-4 w-4" />
            </Toggle>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-3">
              <Label>Image URL</Label>
              <Input
                placeholder="https://example.com/image.jpg"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addImage()}
              />
              <Button size="sm" onClick={addImage}>Add Image</Button>
            </div>
          </PopoverContent>
        </Popover>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Undo/Redo */}
        <Toggle
          size="sm"
          onPressedChange={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo"
        >
          <Undo className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          onPressedChange={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo"
        >
          <Redo className="h-4 w-4" />
        </Toggle>
      </div>

      {/* Email Components Row */}
      <div className="px-2 pb-2 pt-1 border-t border-input flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground font-medium">Insert:</span>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
              <Square className="h-3 w-3" />
              Button
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => insertEmailComponent(emailComponents.primaryButton)}>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-primary" />
                Primary Button
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => insertEmailComponent(emailComponents.secondaryButton)}>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-zinc-200 border" />
                Secondary Button
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
              <RectangleHorizontal className="h-3 w-3" />
              Box
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => insertEmailComponent(emailComponents.infoBox)}>
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-blue-600" />
                Info Box
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => insertEmailComponent(emailComponents.successBox)}>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Success Box
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => insertEmailComponent(emailComponents.warningBox)}>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                Warning Box
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => insertEmailComponent(emailComponents.featureBlock)}>
              <div className="flex items-center gap-2">
                <RectangleHorizontal className="h-4 w-4 text-primary" />
                Feature Block
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => insertEmailComponent(emailComponents.divider)}
        >
          <Minus className="h-3 w-3 mr-1" />
          Divider
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => insertEmailComponent(emailComponents.signature)}
        >
          Signature
        </Button>

        {showPlaceholders && placeholders.length > 0 && (
          <>
            <Separator orientation="vertical" className="h-5 mx-1" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="sm" className="h-7 text-xs gap-1">
                  <MoreHorizontal className="h-3 w-3" />
                  Placeholders
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64">
                <DropdownMenuLabel>Insert Placeholder</DropdownMenuLabel>
                {placeholders.map((p) => (
                  <DropdownMenuItem key={p.key} onClick={() => insertPlaceholder(p.key)}>
                    <div className="flex flex-col">
                      <code className="text-xs font-mono bg-muted px-1 rounded">{p.key}</code>
                      <span className="text-xs text-muted-foreground">{p.description}</span>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>
    </div>
  );
};

interface EmailEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholders?: { key: string; description: string }[];
  showPlaceholders?: boolean;
  className?: string;
  minHeight?: string;
}

export function EmailEditor({
  content,
  onChange,
  placeholders = [],
  showPlaceholders = true,
  className,
  minHeight = '300px'
}: EmailEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({
        multicolor: true,
      }),
      Image.configure({
        HTMLAttributes: {
          style: 'max-width: 100%; height: auto;',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          style: 'color: #1e3a5f; text-decoration: underline;',
        },
      }),
      Placeholder.configure({
        placeholder: 'Start typing your email content...',
      }),
    ],
    content: content,
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm dark:prose-invert max-w-none focus:outline-none p-4',
          'prose-p:my-2 prose-p:text-zinc-700 prose-p:leading-relaxed',
          'prose-headings:font-semibold prose-headings:text-zinc-900',
          'prose-h1:text-2xl prose-h1:mb-4',
          'prose-h2:text-xl prose-h2:mb-3',
          'prose-h3:text-lg prose-h3:mb-2',
          'prose-a:text-primary prose-a:no-underline hover:prose-a:underline',
          'prose-ul:my-2 prose-ol:my-2',
          'prose-li:my-0.5',
          'prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:pl-4 prose-blockquote:italic',
          'prose-img:rounded-lg prose-img:mx-auto',
        ),
        style: `min-height: ${minHeight}`,
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Update content when prop changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Toolbar editor={editor} placeholders={placeholders} showPlaceholders={showPlaceholders} />
      <div className="border border-input rounded-md bg-white overflow-hidden">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
