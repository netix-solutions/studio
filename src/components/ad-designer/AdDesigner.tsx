'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Stage, Layer, Rect, Text, Image as KonvaImage, Transformer, Group } from 'react-konva';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import {
  Type,
  ImageIcon,
  Trash2,
  Download,
  RotateCcw,
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Layers,
  ChevronUp,
  ChevronDown,
  Copy,
  Palette,
  Upload,
  Move,
  ZoomIn,
  ZoomOut,
  Undo,
  Redo,
  Save,
  Loader2,
} from 'lucide-react';
import Konva from 'konva';
import { AD_DIMENSIONS } from '@/lib/types';

// Types for canvas elements
interface CanvasElement {
  id: string;
  type: 'text' | 'image';
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
}

interface TextElement extends CanvasElement {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily: string;
  fontStyle: string;
  fill: string;
  align: 'left' | 'center' | 'right';
  width: number;
}

interface ImageElement extends CanvasElement {
  type: 'image';
  src: string;
  imageObj?: HTMLImageElement;
}

type DesignElement = TextElement | ImageElement;

// Available fonts
const FONTS = [
  { value: 'Inter', label: 'Inter (Modern)' },
  { value: 'Georgia', label: 'Georgia (Classic)' },
  { value: 'Arial Black', label: 'Arial Black (Bold)' },
  { value: 'Playfair Display', label: 'Playfair Display (Elegant)' },
  { value: 'Arial', label: 'Arial' },
  { value: 'Helvetica', label: 'Helvetica' },
  { value: 'Times New Roman', label: 'Times New Roman' },
  { value: 'Verdana', label: 'Verdana' },
  { value: 'Roboto', label: 'Roboto' },
  { value: 'Open Sans', label: 'Open Sans' },
];

// Default colors palette
const COLOR_PALETTE = [
  '#000000', '#FFFFFF', '#1F2937', '#374151', '#6B7280',
  '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16',
  '#22C55E', '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9',
  '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF',
  '#EC4899', '#F43F5E',
];

interface AdDesignerProps {
  width?: number;
  height?: number;
  initialElements?: DesignElement[];
  initialBackgroundColor?: string;
  onSave?: (imageDataUrl: string, elements: DesignElement[], backgroundColor: string) => void;
  onExport?: (imageDataUrl: string) => void;
  isSaving?: boolean;
}

// History state for undo/redo
interface HistoryState {
  elements: DesignElement[];
  backgroundColor: string;
}

export default function AdDesigner({
  width = AD_DIMENSIONS.WIDTH,
  height = AD_DIMENSIONS.HEIGHT,
  initialElements = [],
  initialBackgroundColor = '#FFFFFF',
  onSave,
  onExport,
  isSaving = false,
}: AdDesignerProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [elements, setElements] = useState<DesignElement[]>(initialElements);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [backgroundColor, setBackgroundColor] = useState(initialBackgroundColor);

  // History for undo/redo
  const [history, setHistory] = useState<HistoryState[]>([{ elements: initialElements, backgroundColor: initialBackgroundColor }]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Zoom
  const [scale, setScale] = useState(1);

  // Get selected element
  const selectedElement = elements.find(el => el.id === selectedId);

  // Save history state
  const saveToHistory = useCallback((newElements: DesignElement[], newBgColor: string) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ elements: newElements, backgroundColor: newBgColor });
    // Keep only last 50 states
    if (newHistory.length > 50) {
      newHistory.shift();
    }
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  // Undo
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setElements(history[newIndex].elements);
      setBackgroundColor(history[newIndex].backgroundColor);
    }
  }, [history, historyIndex]);

  // Redo
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setElements(history[newIndex].elements);
      setBackgroundColor(history[newIndex].backgroundColor);
    }
  }, [history, historyIndex]);

  // Update transformer when selection changes
  useEffect(() => {
    if (transformerRef.current && stageRef.current) {
      const stage = stageRef.current;
      const transformer = transformerRef.current;

      if (selectedId) {
        const selectedNode = stage.findOne(`#${selectedId}`);
        if (selectedNode) {
          transformer.nodes([selectedNode]);
          transformer.getLayer()?.batchDraw();
        }
      } else {
        transformer.nodes([]);
        transformer.getLayer()?.batchDraw();
      }
    }
  }, [selectedId, elements]);

  // Generate unique ID
  const generateId = () => `element-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Add text element
  const addText = () => {
    const newText: TextElement = {
      id: generateId(),
      type: 'text',
      x: width / 2 - 100,
      y: height / 2 - 20,
      text: 'Double-click to edit',
      fontSize: 24,
      fontFamily: 'Inter',
      fontStyle: 'normal',
      fill: '#1F2937',
      align: 'center',
      width: 200,
    };
    const newElements = [...elements, newText];
    setElements(newElements);
    setSelectedId(newText.id);
    saveToHistory(newElements, backgroundColor);
  };

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.src = reader.result as string;
      img.onload = () => {
        // Calculate size to fit within canvas while maintaining aspect ratio
        let imgWidth = img.width;
        let imgHeight = img.height;
        const maxWidth = width * 0.4;
        const maxHeight = height * 0.6;

        if (imgWidth > maxWidth) {
          const ratio = maxWidth / imgWidth;
          imgWidth = maxWidth;
          imgHeight = imgHeight * ratio;
        }
        if (imgHeight > maxHeight) {
          const ratio = maxHeight / imgHeight;
          imgHeight = maxHeight;
          imgWidth = imgWidth * ratio;
        }

        const newImage: ImageElement = {
          id: generateId(),
          type: 'image',
          x: 20,
          y: (height - imgHeight) / 2,
          width: imgWidth,
          height: imgHeight,
          src: reader.result as string,
          imageObj: img,
        };
        const newElements = [...elements, newImage];
        setElements(newElements);
        setSelectedId(newImage.id);
        saveToHistory(newElements, backgroundColor);
      };
    };
    reader.readAsDataURL(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Update element
  const updateElement = (id: string, updates: Partial<DesignElement>) => {
    const newElements = elements.map(el =>
      el.id === id ? { ...el, ...updates } as DesignElement : el
    );
    setElements(newElements);
  };

  // Update element with history
  const updateElementWithHistory = (id: string, updates: Partial<DesignElement>) => {
    const newElements = elements.map(el =>
      el.id === id ? { ...el, ...updates } as DesignElement : el
    );
    setElements(newElements);
    saveToHistory(newElements, backgroundColor);
  };

  // Delete selected element
  const deleteSelected = () => {
    if (!selectedId) return;
    const newElements = elements.filter(el => el.id !== selectedId);
    setElements(newElements);
    setSelectedId(null);
    saveToHistory(newElements, backgroundColor);
  };

  // Duplicate selected element
  const duplicateSelected = () => {
    if (!selectedElement) return;
    const newElement = {
      ...selectedElement,
      id: generateId(),
      x: selectedElement.x + 20,
      y: selectedElement.y + 20,
    };
    if (newElement.type === 'image' && 'imageObj' in selectedElement) {
      (newElement as ImageElement).imageObj = selectedElement.imageObj;
    }
    const newElements = [...elements, newElement];
    setElements(newElements);
    setSelectedId(newElement.id);
    saveToHistory(newElements, backgroundColor);
  };

  // Move layer
  const moveLayer = (direction: 'up' | 'down') => {
    if (!selectedId) return;
    const index = elements.findIndex(el => el.id === selectedId);
    if (index === -1) return;

    const newElements = [...elements];
    if (direction === 'up' && index < elements.length - 1) {
      [newElements[index], newElements[index + 1]] = [newElements[index + 1], newElements[index]];
    } else if (direction === 'down' && index > 0) {
      [newElements[index], newElements[index - 1]] = [newElements[index - 1], newElements[index]];
    }
    setElements(newElements);
    saveToHistory(newElements, backgroundColor);
  };

  // Handle stage click for deselection
  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (e.target === e.target.getStage()) {
      setSelectedId(null);
    }
  };

  // Handle drag end
  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>, id: string) => {
    updateElementWithHistory(id, {
      x: e.target.x(),
      y: e.target.y(),
    });
  };

  // Handle transform end
  const handleTransformEnd = (e: Konva.KonvaEventObject<Event>, id: string) => {
    const node = e.target;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    const element = elements.find(el => el.id === id);
    if (!element) return;

    if (element.type === 'text') {
      // For text, reset scale and adjust width/fontSize
      node.scaleX(1);
      node.scaleY(1);
      updateElementWithHistory(id, {
        x: node.x(),
        y: node.y(),
        width: Math.max(20, (element.width || 200) * scaleX),
        fontSize: Math.max(8, (element as TextElement).fontSize * scaleY),
        rotation: node.rotation(),
      });
    } else {
      // For images, keep scale values
      updateElementWithHistory(id, {
        x: node.x(),
        y: node.y(),
        width: Math.max(20, (element.width || 100) * scaleX),
        height: Math.max(20, (element.height || 100) * scaleY),
        rotation: node.rotation(),
        scaleX: 1,
        scaleY: 1,
      });
      node.scaleX(1);
      node.scaleY(1);
    }
  };

  // Handle text double-click for editing
  const handleTextDblClick = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>, id: string) => {
    const textNode = e.target as Konva.Text;
    const stage = stageRef.current;
    if (!stage) return;

    const element = elements.find(el => el.id === id) as TextElement;
    if (!element) return;

    // Hide text node temporarily
    textNode.hide();
    transformerRef.current?.hide();

    // Create textarea over canvas
    const stageContainer = stage.container();
    const stageRect = stageContainer.getBoundingClientRect();
    const textPosition = textNode.absolutePosition();

    const textarea = document.createElement('textarea');
    stageContainer.appendChild(textarea);

    textarea.value = element.text;
    textarea.style.position = 'absolute';
    textarea.style.top = `${textPosition.y * scale}px`;
    textarea.style.left = `${textPosition.x * scale}px`;
    textarea.style.width = `${(element.width || 200) * scale}px`;
    textarea.style.height = 'auto';
    textarea.style.fontSize = `${element.fontSize * scale}px`;
    textarea.style.fontFamily = element.fontFamily;
    textarea.style.color = element.fill;
    textarea.style.border = '2px solid #3B82F6';
    textarea.style.padding = '4px';
    textarea.style.margin = '0px';
    textarea.style.overflow = 'hidden';
    textarea.style.background = 'white';
    textarea.style.outline = 'none';
    textarea.style.resize = 'none';
    textarea.style.lineHeight = '1.2';
    textarea.style.textAlign = element.align;
    textarea.style.transformOrigin = 'left top';
    textarea.style.zIndex = '1000';

    textarea.focus();
    textarea.select();

    const removeTextarea = () => {
      textarea.remove();
      textNode.show();
      transformerRef.current?.show();
      transformerRef.current?.forceUpdate();
    };

    textarea.addEventListener('keydown', (evt) => {
      if (evt.key === 'Enter' && !evt.shiftKey) {
        updateElementWithHistory(id, { text: textarea.value });
        removeTextarea();
      }
      if (evt.key === 'Escape') {
        removeTextarea();
      }
    });

    textarea.addEventListener('blur', () => {
      updateElementWithHistory(id, { text: textarea.value });
      removeTextarea();
    });
  };

  // Export to PNG
  const exportToPNG = () => {
    if (!stageRef.current) return;

    // Temporarily deselect to hide transformer
    const prevSelected = selectedId;
    setSelectedId(null);

    setTimeout(() => {
      if (!stageRef.current) return;

      const dataUrl = stageRef.current.toDataURL({
        pixelRatio: 2, // Higher quality
        mimeType: 'image/png',
      });

      if (onExport) {
        onExport(dataUrl);
      } else {
        // Download directly
        const link = document.createElement('a');
        link.download = `ad-design-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
      }

      // Restore selection
      setSelectedId(prevSelected);
    }, 100);
  };

  // Handle save
  const handleSave = () => {
    if (!stageRef.current || !onSave) return;

    // Temporarily deselect to hide transformer
    const prevSelected = selectedId;
    setSelectedId(null);

    setTimeout(() => {
      if (!stageRef.current) return;

      const dataUrl = stageRef.current.toDataURL({
        pixelRatio: 2,
        mimeType: 'image/png',
      });

      onSave(dataUrl, elements, backgroundColor);

      // Restore selection
      setSelectedId(prevSelected);
    }, 100);
  };

  // Update background color with history
  const updateBackgroundColor = (color: string) => {
    setBackgroundColor(color);
    saveToHistory(elements, color);
  };

  // Render canvas element
  const renderElement = (element: DesignElement) => {
    const isSelected = selectedId === element.id;

    if (element.type === 'text') {
      const textEl = element as TextElement;
      return (
        <Text
          key={element.id}
          id={element.id}
          x={element.x}
          y={element.y}
          text={textEl.text}
          fontSize={textEl.fontSize}
          fontFamily={textEl.fontFamily}
          fontStyle={textEl.fontStyle}
          fill={textEl.fill}
          align={textEl.align}
          width={textEl.width}
          rotation={element.rotation || 0}
          draggable
          onClick={() => setSelectedId(element.id)}
          onTap={() => setSelectedId(element.id)}
          onDragEnd={(e) => handleDragEnd(e, element.id)}
          onTransformEnd={(e) => handleTransformEnd(e, element.id)}
          onDblClick={(e) => handleTextDblClick(e, element.id)}
          onDblTap={(e) => handleTextDblClick(e, element.id)}
        />
      );
    }

    if (element.type === 'image') {
      const imgEl = element as ImageElement;
      return (
        <KonvaImage
          key={element.id}
          id={element.id}
          x={element.x}
          y={element.y}
          width={element.width}
          height={element.height}
          image={imgEl.imageObj}
          rotation={element.rotation || 0}
          draggable
          onClick={() => setSelectedId(element.id)}
          onTap={() => setSelectedId(element.id)}
          onDragEnd={(e) => handleDragEnd(e, element.id)}
          onTransformEnd={(e) => handleTransformEnd(e, element.id)}
        />
      );
    }

    return null;
  };

  return (
    <div className="flex gap-4">
      {/* Left side: Canvas and inline toolbar */}
      <div className="flex flex-col gap-3">
        {/* Compact Toolbar above canvas */}
        <div className="flex items-center gap-1 p-2 bg-muted rounded-lg" style={{ width: width * scale }}>
          {/* Add Elements */}
          <Button variant="outline" size="sm" onClick={addText} className="h-8 px-2">
            <Type className="h-4 w-4 mr-1" /> Text
          </Button>
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="h-8 px-2">
            <ImageIcon className="h-4 w-4 mr-1" /> Image
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />

          <Separator orientation="vertical" className="h-6 mx-1" />

          {/* Undo/Redo */}
          <Button variant="ghost" size="icon" onClick={undo} disabled={historyIndex <= 0} title="Undo" className="h-8 w-8">
            <Undo className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={redo} disabled={historyIndex >= history.length - 1} title="Redo" className="h-8 w-8">
            <Redo className="h-4 w-4" />
          </Button>

          <Separator orientation="vertical" className="h-6 mx-1" />

          {/* Background Color */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 px-2">
                <div className="w-4 h-4 rounded border" style={{ backgroundColor }} />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56">
              <div className="space-y-2">
                <Label className="text-xs">Background</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={backgroundColor}
                    onChange={(e) => updateBackgroundColor(e.target.value)}
                    className="w-10 h-8 p-1 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={backgroundColor}
                    onChange={(e) => updateBackgroundColor(e.target.value)}
                    className="flex-1 h-8 text-xs"
                  />
                </div>
                <div className="grid grid-cols-11 gap-1">
                  {COLOR_PALETTE.map((color) => (
                    <button
                      key={color}
                      className="w-4 h-4 rounded border border-gray-200 hover:scale-110 transition-transform"
                      style={{ backgroundColor: color }}
                      onClick={() => updateBackgroundColor(color)}
                    />
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Zoom */}
          <Button variant="ghost" size="icon" onClick={() => setScale(Math.max(0.5, scale - 0.1))} title="Zoom Out" className="h-8 w-8">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-xs w-10 text-center">{Math.round(scale * 100)}%</span>
          <Button variant="ghost" size="icon" onClick={() => setScale(Math.min(2, scale + 0.1))} title="Zoom In" className="h-8 w-8">
            <ZoomIn className="h-4 w-4" />
          </Button>

          <div className="flex-1" />

          {/* Export/Save */}
          <Button variant="outline" size="sm" onClick={exportToPNG} className="h-8 px-2">
            <Download className="h-4 w-4" />
          </Button>
          {onSave && (
            <Button size="sm" onClick={handleSave} disabled={isSaving} className="h-8 px-3">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            </Button>
          )}
        </div>

        {/* Canvas */}
        <div
          className="border rounded-lg overflow-hidden bg-gray-100"
          style={{ boxShadow: '0 0 20px rgba(0,0,0,0.1)' }}
        >
          <Stage
            ref={stageRef}
            width={width * scale}
            height={height * scale}
            scaleX={scale}
            scaleY={scale}
            onClick={handleStageClick}
            onTap={handleStageClick}
            style={{ backgroundColor: '#f3f4f6' }}
          >
            <Layer>
              <Rect x={0} y={0} width={width} height={height} fill={backgroundColor} />
              {elements.map(renderElement)}
              <Transformer
                ref={transformerRef}
                boundBoxFunc={(oldBox, newBox) => {
                  if (newBox.width < 20 || newBox.height < 20) return oldBox;
                  return newBox;
                }}
                enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right', 'middle-left', 'middle-right']}
                rotateEnabled={true}
                borderStroke="#3B82F6"
                anchorFill="#FFFFFF"
                anchorStroke="#3B82F6"
                anchorSize={10}
                anchorCornerRadius={5}
              />
            </Layer>
          </Stage>
        </div>
        <p className="text-xs text-muted-foreground text-center">
          {width} x {height}px &middot; Double-click text to edit
        </p>
      </div>

      {/* Right side: Properties & Layers Panel */}
      <Card className="w-64 shrink-0 self-start">
        <Tabs defaultValue="properties" className="w-full">
          <TabsList className="w-full grid grid-cols-2 h-9">
            <TabsTrigger value="properties" className="text-xs">Properties</TabsTrigger>
            <TabsTrigger value="layers" className="text-xs">
              Layers {elements.length > 0 && `(${elements.length})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="properties" className="m-0">
            <CardContent className="p-3">
              {selectedElement ? (
                <div className="space-y-3">
                  {/* Element actions row */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground uppercase">
                      {selectedElement.type === 'text' ? 'Text' : 'Image'}
                    </span>
                    <div className="flex gap-0.5">
                      <Button variant="ghost" size="icon" onClick={() => moveLayer('up')} title="Bring Forward" className="h-7 w-7">
                        <ChevronUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => moveLayer('down')} title="Send Backward" className="h-7 w-7">
                        <ChevronDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={duplicateSelected} title="Duplicate" className="h-7 w-7">
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={deleteSelected} className="h-7 w-7 text-destructive" title="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  {/* Text Properties */}
                  {selectedElement.type === 'text' && (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Text</Label>
                        <Input
                          value={(selectedElement as TextElement).text}
                          onChange={(e) => updateElementWithHistory(selectedElement.id, { text: e.target.value })}
                          className="h-8 text-sm"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Font</Label>
                          <Select
                            value={(selectedElement as TextElement).fontFamily}
                            onValueChange={(value) => updateElementWithHistory(selectedElement.id, { fontFamily: value })}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {FONTS.map((font) => (
                                <SelectItem key={font.value} value={font.value} className="text-xs">
                                  <span style={{ fontFamily: font.value }}>{font.value}</span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Size</Label>
                          <Input
                            type="number"
                            value={(selectedElement as TextElement).fontSize}
                            onChange={(e) => updateElementWithHistory(selectedElement.id, { fontSize: parseInt(e.target.value) || 24 })}
                            min={8}
                            max={72}
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex gap-0.5">
                          <Button
                            variant={(selectedElement as TextElement).fontStyle.includes('bold') ? 'default' : 'outline'}
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => {
                              const current = (selectedElement as TextElement).fontStyle;
                              const isBold = current.includes('bold');
                              const isItalic = current.includes('italic');
                              let newStyle = 'normal';
                              if (!isBold && !isItalic) newStyle = 'bold';
                              else if (!isBold && isItalic) newStyle = 'bold italic';
                              else if (isBold && !isItalic) newStyle = 'normal';
                              else newStyle = 'italic';
                              updateElementWithHistory(selectedElement.id, { fontStyle: newStyle });
                            }}
                          >
                            <Bold className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant={(selectedElement as TextElement).fontStyle.includes('italic') ? 'default' : 'outline'}
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => {
                              const current = (selectedElement as TextElement).fontStyle;
                              const isBold = current.includes('bold');
                              const isItalic = current.includes('italic');
                              let newStyle = 'normal';
                              if (!isBold && !isItalic) newStyle = 'italic';
                              else if (isBold && !isItalic) newStyle = 'bold italic';
                              else if (!isBold && isItalic) newStyle = 'normal';
                              else newStyle = 'bold';
                              updateElementWithHistory(selectedElement.id, { fontStyle: newStyle });
                            }}
                          >
                            <Italic className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <Separator orientation="vertical" className="h-5" />
                        <div className="flex gap-0.5">
                          <Button
                            variant={(selectedElement as TextElement).align === 'left' ? 'default' : 'outline'}
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateElementWithHistory(selectedElement.id, { align: 'left' })}
                          >
                            <AlignLeft className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant={(selectedElement as TextElement).align === 'center' ? 'default' : 'outline'}
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateElementWithHistory(selectedElement.id, { align: 'center' })}
                          >
                            <AlignCenter className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant={(selectedElement as TextElement).align === 'right' ? 'default' : 'outline'}
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateElementWithHistory(selectedElement.id, { align: 'right' })}
                          >
                            <AlignRight className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Color</Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={(selectedElement as TextElement).fill}
                            onChange={(e) => updateElementWithHistory(selectedElement.id, { fill: e.target.value })}
                            className="w-8 h-8 p-1 cursor-pointer"
                          />
                          <Input
                            type="text"
                            value={(selectedElement as TextElement).fill}
                            onChange={(e) => updateElementWithHistory(selectedElement.id, { fill: e.target.value })}
                            className="flex-1 h-8 text-xs"
                          />
                        </div>
                        <div className="grid grid-cols-11 gap-1 pt-1">
                          {COLOR_PALETTE.map((color) => (
                            <button
                              key={color}
                              className="w-4 h-4 rounded border border-gray-200 hover:scale-110 transition-transform"
                              style={{ backgroundColor: color }}
                              onClick={() => updateElementWithHistory(selectedElement.id, { fill: color })}
                            />
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Position</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground w-4">X</span>
                            <Input
                              type="number"
                              value={Math.round(selectedElement.x)}
                              onChange={(e) => updateElementWithHistory(selectedElement.id, { x: parseInt(e.target.value) || 0 })}
                              className="h-7 text-xs"
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground w-4">Y</span>
                            <Input
                              type="number"
                              value={Math.round(selectedElement.y)}
                              onChange={(e) => updateElementWithHistory(selectedElement.id, { y: parseInt(e.target.value) || 0 })}
                              className="h-7 text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Image Properties */}
                  {selectedElement.type === 'image' && (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Size: {Math.round(selectedElement.width || 100)}px</Label>
                        <Slider
                          value={[selectedElement.width || 100]}
                          onValueChange={([value]) => {
                            const ratio = (selectedElement.height || 100) / (selectedElement.width || 100);
                            updateElement(selectedElement.id, { width: value, height: value * ratio });
                          }}
                          onValueCommit={([value]) => {
                            const ratio = (selectedElement.height || 100) / (selectedElement.width || 100);
                            updateElementWithHistory(selectedElement.id, { width: value, height: value * ratio });
                          }}
                          min={20}
                          max={width}
                          step={1}
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Position</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground w-4">X</span>
                            <Input
                              type="number"
                              value={Math.round(selectedElement.x)}
                              onChange={(e) => updateElementWithHistory(selectedElement.id, { x: parseInt(e.target.value) || 0 })}
                              className="h-7 text-xs"
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground w-4">Y</span>
                            <Input
                              type="number"
                              value={Math.round(selectedElement.y)}
                              onChange={(e) => updateElementWithHistory(selectedElement.id, { y: parseInt(e.target.value) || 0 })}
                              className="h-7 text-xs"
                            />
                          </div>
                        </div>
                      </div>

                      <Button variant="outline" size="sm" className="w-full h-8" onClick={() => fileInputRef.current?.click()}>
                        <Upload className="h-3.5 w-3.5 mr-1" /> Replace Image
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <Move className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs">Select an element to edit</p>
                </div>
              )}
            </CardContent>
          </TabsContent>

          <TabsContent value="layers" className="m-0">
            <CardContent className="p-3">
              {elements.length > 0 ? (
                <div className="space-y-1">
                  {[...elements].reverse().map((element, index) => (
                    <div
                      key={element.id}
                      className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors text-sm ${
                        selectedId === element.id ? 'bg-primary/10 border border-primary' : 'hover:bg-muted'
                      }`}
                      onClick={() => setSelectedId(element.id)}
                    >
                      {element.type === 'text' ? (
                        <Type className="h-3.5 w-3.5 shrink-0" />
                      ) : (
                        <ImageIcon className="h-3.5 w-3.5 shrink-0" />
                      )}
                      <span className="text-xs truncate flex-1">
                        {element.type === 'text'
                          ? (element as TextElement).text.substring(0, 25) || 'Empty text'
                          : `Image ${elements.length - index}`}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <Layers className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs">No elements yet</p>
                  <p className="text-xs mt-1">Add text or images to begin</p>
                </div>
              )}
            </CardContent>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}

// Export types for use in other components
export type { DesignElement, TextElement, ImageElement };
