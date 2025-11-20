'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Plus, Edit, Trash2, Crown, Loader2, Check, X } from 'lucide-react'
import { getPlanColor } from '@/lib/utils'
import type { Plan, PlanTier } from '@/types'

interface PlansManagerProps {
  plans: Plan[]
}

export function PlansManager({ plans: initialPlans }: PlansManagerProps) {
  const [plans, setPlans] = useState(initialPlans)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<Plan | null>(null)
  const [loading, setLoading] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [tier, setTier] = useState<PlanTier>('free')
  const [price, setPrice] = useState('')
  const [credits, setCredits] = useState('')
  const [durationDays, setDurationDays] = useState('30')
  const [featuresText, setFeaturesText] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [sortOrder, setSortOrder] = useState('0')

  const resetForm = () => {
    setName('')
    setDescription('')
    setTier('free')
    setPrice('')
    setCredits('')
    setDurationDays('30')
    setFeaturesText('')
    setIsActive(true)
    setSortOrder('0')
    setEditingPlan(null)
  }

  const openDialog = (plan?: Plan) => {
    if (plan) {
      setEditingPlan(plan)
      setName(plan.name)
      setDescription(plan.description || '')
      setTier(plan.tier)
      setPrice(plan.price.toString())
      setCredits(plan.credits.toString())
      setDurationDays(plan.duration_days.toString())
      setFeaturesText(plan.features.join('\n'))
      setIsActive(plan.is_active)
      setSortOrder(plan.sort_order.toString())
    } else {
      resetForm()
    }
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    if (!name.trim()) return

    setLoading(true)
    const supabase = createClient()

    const features = featuresText
      .split('\n')
      .map(f => f.trim())
      .filter(f => f.length > 0)

    const planData = {
      name: name.trim(),
      description: description.trim() || null,
      tier,
      price: parseFloat(price) || 0,
      credits: parseInt(credits) || 0,
      duration_days: parseInt(durationDays) || 30,
      features,
      is_active: isActive,
      sort_order: parseInt(sortOrder) || 0,
    }

    try {
      if (editingPlan) {
        const { data, error } = await supabase
          .from('plans')
          .update(planData)
          .eq('id', editingPlan.id)
          .select()
          .single()

        if (error) throw error
        setPlans(prev => prev.map(p => p.id === editingPlan.id ? data : p))
      } else {
        const { data, error } = await supabase
          .from('plans')
          .insert(planData)
          .select()
          .single()

        if (error) throw error
        setPlans(prev => [...prev, data].sort((a, b) => a.sort_order - b.sort_order))
      }

      setIsDialogOpen(false)
      resetForm()
    } catch (error) {
      console.error('Error saving plan:', error)
      alert('Erro ao salvar plano')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (plan: Plan) => {
    setLoading(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('plans')
        .delete()
        .eq('id', plan.id)

      if (error) throw error
      setPlans(prev => prev.filter(p => p.id !== plan.id))
    } catch (error) {
      console.error('Error deleting plan:', error)
      alert('Erro ao excluir plano')
    } finally {
      setLoading(false)
      setDeleteConfirm(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gerenciar Planos</h1>
          <p className="text-muted-foreground">
            Administre os planos e preços do sistema
          </p>
        </div>
        <Button onClick={() => openDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Plano
        </Button>
      </div>

      {/* Plans Grid */}
      {plans.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Nenhum plano cadastrado. Clique em "Novo Plano" para criar o primeiro plano.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map(plan => (
          <Card key={plan.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Crown className={`h-4 w-4 ${getPlanColor(plan.tier)}`} />
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => openDialog(plan)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => setDeleteConfirm(plan)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Preço:</span>
                  <span className="font-bold">R$ {plan.price.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Créditos:</span>
                  <span className="font-medium">{plan.credits.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Duração:</span>
                  <span className="font-medium">{plan.duration_days} dias</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <Badge variant={plan.is_active ? 'default' : 'secondary'}>
                    {plan.is_active ? <Check className="h-3 w-3 mr-1" /> : <X className="h-3 w-3 mr-1" />}
                    {plan.is_active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
          ))}
        </div>
      )}

      {/* Edit/Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPlan ? 'Editar Plano' : 'Novo Plano'}</DialogTitle>
            <DialogDescription>
              Configure os detalhes do plano
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Tier *</Label>
                <Select value={tier} onValueChange={(v) => setTier(v as PlanTier)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Grátis</SelectItem>
                    <SelectItem value="bronze">Bronze</SelectItem>
                    <SelectItem value="silver">Prata</SelectItem>
                    <SelectItem value="gold">Ouro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Preço (R$) *</Label>
                <Input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Créditos *</Label>
                <Input type="number" value={credits} onChange={(e) => setCredits(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Duração (dias) *</Label>
                <Input type="number" value={durationDays} onChange={(e) => setDurationDays(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Recursos (um por linha)</Label>
              <Textarea
                value={featuresText}
                onChange={(e) => setFeaturesText(e.target.value)}
                rows={6}
                placeholder="100 créditos/mês&#10;1 instância WhatsApp&#10;Templates básicos"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Switch checked={isActive} onCheckedChange={setIsActive} />
                <Label>Plano Ativo</Label>
              </div>
              <div className="space-y-2">
                <Label>Ordem de Exibição</Label>
                <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={loading || !name.trim()}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingPlan ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Plano</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o plano "{deleteConfirm?.name}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
