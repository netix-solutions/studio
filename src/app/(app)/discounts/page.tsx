'use client';
import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { mockDiscounts, Discount } from '@/lib/mock-data';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, MoreHorizontal } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export default function DiscountsPage() {
    const { toast } = useToast();
    
    const handleCreateDiscount = () => {
        // In a real app, you would handle form submission here
        toast({
            title: 'Discount Created',
            description: 'The new discount code has been successfully created.',
        });
    };

    const getStatusBadgeVariant = (status: Discount['status']) => {
        return status === 'Active' ? 'secondary' : 'outline';
    };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
            <CardTitle>Discount Offers</CardTitle>
            <CardDescription>Create and manage discount offers for ad subscriptions.</CardDescription>
        </div>
        <Dialog>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create Discount
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                <DialogTitle>Create New Discount</DialogTitle>
                <DialogDescription>
                    Fill in the details to create a new discount code.
                </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="code" className="text-right">
                    Code
                    </Label>
                    <Input id="code" defaultValue="NEWYEAR25" className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="percentage" className="text-right">
                    Percentage
                    </Label>
                    <Input id="percentage" type="number" defaultValue="25" className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-start gap-4">
                    <Label className="text-right pt-2">Applicable To</Label>
                    <div className="col-span-3 space-y-2">
                        <div className="flex items-center space-x-2">
                            <Checkbox id="monthly" />
                            <Label htmlFor="monthly">Monthly</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox id="quarterly" />
                            <Label htmlFor="quarterly">Quarterly</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox id="yearly" />
                            <Label htmlFor="yearly">Yearly</Label>
                        </div>
                    </div>
                </div>
                </div>
                <DialogFooter>
                <Button type="submit" onClick={handleCreateDiscount}>Create Discount</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Percentage</TableHead>
                    <TableHead>Applicable To</TableHead>
                    <TableHead>Redemptions</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead><span className="sr-only">Actions</span></TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {mockDiscounts.map((d) => (
                    <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.code}</TableCell>
                    <TableCell>{d.percentage}%</TableCell>
                    <TableCell>
                        <div className="flex flex-wrap gap-1">
                            {d.applicableTo.map(plan => <Badge key={plan} variant="outline">{plan}</Badge>)}
                        </div>
                    </TableCell>
                    <TableCell>{d.redemptions}</TableCell>
                    <TableCell>
                        <Badge variant={getStatusBadgeVariant(d.status)}>{d.status}</Badge>
                    </TableCell>
                    <TableCell>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">Open menu</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem>Edit</DropdownMenuItem>
                                <DropdownMenuItem className="text-red-600">Deactivate</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
        </div>
      </CardContent>
    </Card>
  );
}
