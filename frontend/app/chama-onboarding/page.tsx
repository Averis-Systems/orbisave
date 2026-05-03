"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useForm, FormProvider, useFormContext } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { api } from "@/lib/api"
import { useAuthStore } from "@/store/auth"
import { LOCATION_DATA, getLevel1, getLevel2 } from "@/lib/location-data"
import { ShieldCheck, UserCheck, AlertCircle, Building2, MapPin, Eye, EyeOff, Check, ArrowRight, Loader2 } from "lucide-react"
import { CustomSelect } from "@/components/ui/select"

// ─── Constants ─────────────────────────────────────────────────────────────────
const STEP_META = [
  { title: "Welcome to Leadership", desc: "Understand your role and responsibilities as a Group Chairperson." },
  { title: "Create Your Account", desc: "Enter your professional details. Your phone number must match your country." },
  { title: "Configure Your Chama", desc: "Set up the group identity, contribution requirements, and rotation schedule." },
  { title: "Group Location", desc: "This helps us connect your group with local partners and financiers." },
  { title: "Review & Complete", desc: "Verify your details and accept the terms of governance." }
]
const TOTAL_STEPS = STEP_META.length
const GROUP_TYPES = ["Farmers", "Corporate", "Women Self Help", "Fishers", "Students", "Other"]

// ─── Zod Schemas ─────────────────────────────────────────────────────────────
const accountSchema = z.object({
  country: z.enum(["kenya", "rwanda", "ghana"] as const, { required_error: "Country is required" }),
  full_name: z.string().min(3, "Full name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(1, "Phone is required"),
  password: z.string().min(8, "Minimum 8 characters"),
  confirmPassword: z.string(),
}).superRefine((data, ctx) => {
  if (data.password !== data.confirmPassword) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Passwords do not match", path: ["confirmPassword"] })
  }
  if (data.country && data.phone) {
    const loc = LOCATION_DATA[data.country]
    if (!loc.phonePattern.test(data.phone)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Format must match ${loc.phoneHint}`, path: ["phone"] })
    }
  }
})

const groupSchema = z.object({
  group_name: z.string().min(3, "Group name is required"),
  group_type: z.string().min(1, "Group type is required"),
  group_type_other: z.string().optional(),
  contribution_amount: z.number({ invalid_type_error: "Amount is required" }).min(1, "Amount must be > 0"),
  contribution_frequency: z.enum(["Daily", "Every 3 Days", "Every 5 Days", "Weekly", "Every 2 Weeks", "Monthly", "Harvest"]),
})

const locationSchema = z.object({
  level1: z.string().min(1, "Required"),
  level2: z.string().min(1, "Required"),
})

const reviewSchema = z.object({
  agreePrivacy: z.boolean().refine(val => val === true, "You must accept the Privacy Policy"),
  agreeTerms: z.boolean().refine(val => val === true, "You must accept the Terms of Use"),
})

const wizardSchema = z.intersection(
  z.intersection(accountSchema, groupSchema),
  z.intersection(locationSchema, reviewSchema)
)

type WizardData = z.infer<typeof wizardSchema>

const defaultValues: Partial<WizardData> = {
  country: "kenya",
  group_type: "Corporate",
  contribution_frequency: "Monthly",
}

// ─── Components ──────────────────────────────────────────────────────────────

// Step 1
function StepRole() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-primary/5 border border-primary/10 p-6 rounded-xl flex gap-4">
        <ShieldCheck className="w-8 h-8 text-primary shrink-0" />
        <div>
          <h3 className="text-lg font-bold text-foreground mb-2">You are becoming a Group Chairperson.</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            As a Chairperson, you hold full governance over this Chama. You will be responsible for initiating payouts, setting rules, and ensuring members adhere to the schedule. Due to regulatory requirements, mandatory KYC identity verification will be required before you can fully activate the group.
          </p>
        </div>
      </div>
      <div>
        <h4 className="text-sm font-bold text-foreground mb-4">Governance Roles in OrbiSave</h4>
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-4 border border-border rounded-lg bg-white shadow-sm ring-1 ring-primary/20">
            <UserCheck className="w-5 h-5 text-primary" />
            <div>
              <div className="font-bold text-sm text-foreground">Chairperson (You)</div>
              <div className="text-xs text-muted-foreground">Final approver for all activities.</div>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 border border-border rounded-lg bg-muted/30">
            <div className="w-5 h-5 border-2 border-dashed border-muted-foreground/30 rounded-full flex items-center justify-center shrink-0"></div>
            <div>
              <div className="font-bold text-sm text-muted-foreground">Treasurer</div>
              <div className="text-xs text-muted-foreground">Monitors payments. (Appointed later in dashboard)</div>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 border border-border rounded-lg bg-muted/30">
             <div className="w-5 h-5 border-2 border-dashed border-muted-foreground/30 rounded-full flex items-center justify-center shrink-0"></div>
            <div>
              <div className="font-bold text-sm text-muted-foreground">Secretary</div>
              <div className="text-xs text-muted-foreground">Manages members. (Appointed later in dashboard)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Step 2
function StepAccount() {
  const { register, watch, setValue, formState: { errors } } = useFormContext<WizardData>()
  const country = watch("country")
  const password = watch("password") || ""
  const phoneHint = country ? LOCATION_DATA[country].phoneHint : ""

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const calculateStrength = (pwd: string) => {
    let score = 0;
    if (!pwd) return score;
    if (pwd.length >= 8) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;
    return score; // 0 to 4
  }

  const strength = calculateStrength(password)
  const strengthColors = ["bg-muted", "bg-destructive", "bg-orange-500", "bg-yellow-500", "bg-primary"]
  const strengthLabels = ["Very Weak", "Weak", "Fair", "Good", "Strong"]

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <CustomSelect
        label="Country of Operation"
        options={[
          { value: "kenya", label: "Kenya" },
          { value: "rwanda", label: "Rwanda" },
          { value: "ghana", label: "Ghana" }
        ]}
        value={country}
        onChange={(val) => setValue("country", val as any)}
        error={errors.country?.message}
      />

      <div className="grid md:grid-cols-2 gap-6">
        <div className="md:col-span-2">
           <label className="block text-xs font-bold text-muted-foreground tracking-widest uppercase mb-2">Full Name (As on ID)</label>
           <input type="text" {...register("full_name")} className="w-full h-12 px-4 bg-muted/50 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all" placeholder="First Last" />
           {errors.full_name && <p className="text-xs text-destructive mt-1.5">{errors.full_name.message}</p>}
        </div>
        <div>
           <label className="block text-xs font-bold text-muted-foreground tracking-widest uppercase mb-2">Professional Email</label>
           <input type="email" {...register("email")} className="w-full h-12 px-4 bg-muted/50 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all" placeholder="name@domain.com" />
           {errors.email && <p className="text-xs text-destructive mt-1.5">{errors.email.message}</p>}
        </div>
        <div>
           <label className="block text-xs font-bold text-muted-foreground tracking-widest uppercase mb-2">Phone Number</label>
           <input type="tel" {...register("phone")} className="w-full h-12 px-4 bg-muted/50 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all" placeholder={phoneHint} />
           {errors.phone && <p className="text-xs text-destructive mt-1.5">{errors.phone.message}</p>}
        </div>
        
        <div>
           <label className="block text-xs font-bold text-muted-foreground tracking-widest uppercase mb-2">Secure Password</label>
           <div className="relative">
             <input type={showPassword ? "text" : "password"} {...register("password")} className="w-full h-12 px-4 pr-10 bg-muted/50 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all" placeholder="••••••••" />
             <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
               {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
             </button>
           </div>
           {/* Strength Indicator */}
           {password.length > 0 && (
             <div className="mt-2 space-y-1.5">
               <div className="flex gap-1 h-1.5 w-full">
                 {[1, 2, 3, 4].map((level) => (
                   <div key={level} className={`flex-1 rounded-full transition-colors duration-300 ${strength >= level ? strengthColors[strength] : 'bg-muted'}`}></div>
                 ))}
               </div>
               <div className="text-[10px] text-right font-medium text-muted-foreground uppercase tracking-widest">
                 {strengthLabels[strength]}
               </div>
             </div>
           )}
           {errors.password && <p className="text-xs text-destructive mt-1.5">{errors.password.message}</p>}
        </div>
        
        <div className="self-start">
           <label className="block text-xs font-bold text-muted-foreground tracking-widest uppercase mb-2">Confirm Password</label>
           <div className="relative">
             <input type={showConfirmPassword ? "text" : "password"} {...register("confirmPassword")} className="w-full h-12 px-4 pr-10 bg-muted/50 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all" placeholder="••••••••" />
             <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
               {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
             </button>
           </div>
           {errors.confirmPassword && <p className="text-xs text-destructive mt-1.5">{errors.confirmPassword.message}</p>}
        </div>
      </div>
    </div>
  )
}

// Step 3
function StepGroup() {
  const { register, watch, setValue, formState: { errors } } = useFormContext<WizardData>()
  const country = watch("country")
  const groupType = watch("group_type")
  const currency = country ? LOCATION_DATA[country].currency : "KES"

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <label className="block text-xs font-bold text-muted-foreground tracking-widest uppercase mb-2">Chama Name</label>
        <div className="relative">
          <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <input type="text" {...register("group_name")} className="w-full h-12 pl-12 pr-4 bg-muted/50 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all" placeholder="E.g. Sunrise Investment Group" />
        </div>
        {errors.group_name && <p className="text-xs text-destructive mt-1.5">{errors.group_name.message}</p>}
      </div>

      <div>
        <label className="block text-xs font-bold text-muted-foreground tracking-widest uppercase mb-3">Group Type</label>
        <div className="flex flex-wrap gap-2">
          {GROUP_TYPES.map(type => (
            <button
              key={type}
              type="button"
              onClick={() => setValue("group_type", type)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border ${groupType === type ? 'bg-primary border-primary text-primary-foreground shadow-sm' : 'bg-white border-border text-muted-foreground hover:border-primary/50'}`}
            >
              {type}
            </button>
          ))}
        </div>
        {groupType === "Other" && (
           <input type="text" {...register("group_type_other")} className="w-full h-12 mt-4 px-4 bg-muted/50 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all" placeholder="Please specify..." />
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="block text-xs font-bold text-muted-foreground tracking-widest uppercase mb-2">Contribution Amount</label>
          <div className="flex items-center rounded-lg overflow-hidden border border-border focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent transition-all">
            <span className="h-12 px-4 flex items-center bg-muted text-sm font-bold text-foreground border-r border-border">{currency}</span>
            <input type="number" {...register("contribution_amount", { valueAsNumber: true })} className="flex-1 h-12 px-4 bg-muted/50 text-sm outline-none" placeholder="0.00" />
          </div>
          {errors.contribution_amount && <p className="text-xs text-destructive mt-1.5">{errors.contribution_amount.message}</p>}
        </div>
        <CustomSelect
          label="Frequency"
          options={[
            { value: "Daily", label: "Daily" },
            { value: "Every 3 Days", label: "Every 3 Days" },
            { value: "Every 5 Days", label: "Every 5 Days" },
            { value: "Weekly", label: "Weekly" },
            { value: "Every 2 Weeks", label: "Every 2 Weeks" },
            { value: "Monthly", label: "Monthly" },
            { value: "Harvest", label: "Harvest (Seasonal)" }
          ]}
          value={watch("contribution_frequency")}
          onChange={(val) => setValue("contribution_frequency", val as any)}
          error={errors.contribution_frequency?.message}
        />
      </div>
    </div>
  )
}

// Step 4
function StepLocation() {
  const { register, watch, setValue, formState: { errors } } = useFormContext<WizardData>()
  const country = watch("country")
  const loc = country ? LOCATION_DATA[country] : null
  const level1Data = country ? getLevel1(country) : []
  const selectedLevel1 = watch("level1")
  const level2Data = country && selectedLevel1 ? getLevel2(country, selectedLevel1) : []

  // Reset level2 when level1 changes
  useEffect(() => {
    setValue("level2", "")
  }, [selectedLevel1, setValue])

  if (!loc) return null

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-primary/5 border border-primary/20 p-5 rounded-xl flex gap-4 text-primary items-center">
        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm shrink-0 border border-primary/10">
          <MapPin className="w-5 h-5" />
        </div>
        <p className="text-sm font-medium leading-relaxed">This helps us connect your group with affordable input financiers and partners operating in your area.</p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-xs font-bold text-muted-foreground tracking-widest uppercase mb-3">Country of Operation</label>
          <div className="flex items-center gap-3 px-4 py-3 bg-white border border-border rounded-lg shadow-sm w-fit group hover:border-primary/30 transition-colors">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/5 text-lg">
              {country === 'kenya' ? '🇰🇪' : country === 'rwanda' ? '🇷🇼' : '🇬🇭'}
            </div>
            <span className="text-sm font-bold text-foreground tracking-tight">{loc.label}</span>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <CustomSelect
            label={loc.level1Label}
            options={level1Data.map(l1 => ({ value: l1, label: l1 }))}
            value={selectedLevel1}
            placeholder={`Select ${loc.level1Label}...`}
            onChange={(val) => setValue("level1", val)}
            error={errors.level1?.message}
          />
          <CustomSelect
            label={loc.level2Label}
            disabled={!selectedLevel1}
            options={level2Data.map(l2 => ({ value: l2, label: l2 }))}
            value={watch("level2")}
            placeholder={`Select ${loc.level2Label}...`}
            onChange={(val) => setValue("level2", val)}
            error={errors.level2?.message}
          />
        </div>
      </div>
    </div>
  )
}

// Step 5
function StepReview() {
  const { register, watch, formState: { errors } } = useFormContext<WizardData>()
  const data = watch()
  const loc = data.country ? LOCATION_DATA[data.country] : null

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white p-6 rounded-xl border border-border shadow-sm">
        <h3 className="text-lg font-bold text-foreground mb-4">Summary</h3>
        <dl className="space-y-4 text-sm">
          <div className="flex justify-between border-b border-border pb-3">
            <dt className="text-muted-foreground">Chairperson</dt>
            <dd className="font-bold text-foreground">{data.full_name || "—"}</dd>
          </div>
          <div className="flex justify-between border-b border-border pb-3">
            <dt className="text-muted-foreground">Chama Name</dt>
            <dd className="font-bold text-primary">{data.group_name || "—"}</dd>
          </div>
          <div className="flex justify-between border-b border-border pb-3">
            <dt className="text-muted-foreground">Group Type</dt>
            <dd className="font-semibold text-foreground">{data.group_type === "Other" ? data.group_type_other : data.group_type}</dd>
          </div>
          <div className="flex justify-between border-b border-border pb-3">
            <dt className="text-muted-foreground">Target Contribution</dt>
            <dd className="font-bold text-primary">{loc?.currency || ""} {data.contribution_amount?.toLocaleString() || 0} / {data.contribution_frequency}</dd>
          </div>
          <div className="flex justify-between pb-1">
            <dt className="text-muted-foreground">Operating Region</dt>
            <dd className="font-medium text-foreground">{data.level2}, {data.level1}</dd>
          </div>
        </dl>
      </div>

      <div className="space-y-4">
        <label className="flex items-start gap-3 cursor-pointer p-4 border border-border rounded-lg hover:border-primary/50 transition-colors">
          <input type="checkbox" {...register("agreePrivacy")} className="mt-1 w-4 h-4 text-primary rounded border-border focus:ring-primary" />
          <span className="text-sm text-muted-foreground leading-snug">I accept the <Link href="/privacy" target="_blank" className="text-primary hover:underline font-medium">Privacy Policy</Link> and consent to the collection of my data in accordance with local regulations.</span>
        </label>
        {errors.agreePrivacy && <p className="text-xs text-destructive px-2">{errors.agreePrivacy.message}</p>}
        
        <label className="flex items-start gap-3 cursor-pointer p-4 border border-border rounded-lg hover:border-primary/50 transition-colors">
          <input type="checkbox" {...register("agreeTerms")} className="mt-1 w-4 h-4 text-primary rounded border-border focus:ring-primary" />
          <span className="text-sm text-muted-foreground leading-snug">I accept the <Link href="/terms" target="_blank" className="text-primary hover:underline font-medium">Terms of Use</Link> and acknowledge my responsibilities as the Group Chairperson.</span>
        </label>
        {errors.agreeTerms && <p className="text-xs text-destructive px-2">{errors.agreeTerms.message}</p>}
      </div>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function ChamaOnboardingPage() {
  const router = useRouter()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [step, setStep] = useState(0)
  const [apiError, setApiError] = useState<string | null>(null)
  const [isSubmittingForm, setIsSubmittingForm] = useState(false)

  const methods = useForm<WizardData>({
    resolver: zodResolver(
      step === 1 ? accountSchema :
      step === 2 ? groupSchema :
      step === 3 ? locationSchema :
      wizardSchema
    ),
    defaultValues,
    mode: "onTouched"
  })

  const { trigger, handleSubmit, getValues } = methods

  const handleNext = async () => {
    let isValid = true
    if (step === 1) isValid = await trigger(["country", "full_name", "email", "phone", "password", "confirmPassword"])
    if (step === 2) isValid = await trigger(["group_name", "group_type", "group_type_other", "contribution_amount", "contribution_frequency"])
    if (step === 3) isValid = await trigger(["level1", "level2"])

    if (isValid) {
      setStep(s => Math.min(TOTAL_STEPS - 1, s + 1))
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleBack = () => {
    setStep(s => Math.max(0, s - 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Backend Mapping Logic
  const mapFrequencyToBackend = (uiVal: string) => {
    if (uiVal === "Daily" || uiVal === "Every 3 Days" || uiVal === "Every 5 Days" || uiVal === "Weekly") return "weekly"
    if (uiVal === "Every 2 Weeks") return "biweekly"
    if (uiVal === "Monthly") return "monthly"
    if (uiVal === "Harvest") return "harvest"
    return "monthly"
  }

  const onSubmit = async (data: WizardData) => {
    setApiError(null)
    setIsSubmittingForm(true)
    try {
      // 1. Register the Chairperson
      await api.post("/auth/register/", {
        full_name: data.full_name,
        email: data.email,
        phone: data.phone,
        password: data.password,
        role: "chairperson",
        country: data.country
      }, {
        headers: { 'X-Country': data.country }
      })

      // 2. Authenticate to get a fresh token
      const tokenRes = await api.post("/auth/token/", { 
        email: data.email, 
        password: data.password 
      }, {
        headers: { 'X-Country': data.country }
      })
      const access = tokenRes.data.access || tokenRes.data.access_token
      
      if (!access) {
        throw new Error("Authentication failed: No access token received.")
      }

      // 3. Fetch Profile & Sync Auth Store
      const profileRes = await api.get("/auth/me/", { 
        headers: { 
          Authorization: `Bearer ${access}`,
          'X-Country': data.country
        } 
      })
      setAuth(profileRes.data, access)

      // 4. Create Group with explicit headers for isolation
      const enrichedDescription = `Type: ${data.group_type === 'Other' ? data.group_type_other : data.group_type}. Location: ${data.level2}, ${data.level1}.`
      
      await api.post("/groups/", {
        name: data.group_name,
        country: data.country,
        contribution_amount: data.contribution_amount,
        contribution_frequency: mapFrequencyToBackend(data.contribution_frequency),
        contribution_day: 1,
        rotation_savings_pct: 70,
        loan_pool_pct: 30,
        description: enrichedDescription
      }, { 
        headers: { 
          Authorization: `Bearer ${access}`,
          'X-Country': data.country 
        } 
      })

      router.push("/dashboard")
    } catch (err: any) {
      console.error("Onboarding submission error:", err.response?.data || err.message)
      if (err.response?.data) {
        const d = err.response.data
        // Standardize error message extraction from the wrapped response
        const errorMessage = d.message || d.detail || d.errors?.detail?.[0] || d.non_field_errors?.[0] || JSON.stringify(d)
        setApiError(errorMessage)
      } else {
        setApiError(err.message || "Network error. Please check your connection.")
      }
    } finally {
      setIsSubmittingForm(false)
    }
  }

  const meta = STEP_META[step]

  return (
    <FormProvider {...methods}>
      <div className="min-h-screen bg-background flex flex-col md:flex-row font-sans selection:bg-primary/20 selection:text-primary">
        
        {/* Left Side: Context / Branding */}
        <div className="md:w-[40%] lg:w-[35%] bg-muted/30 border-b md:border-b-0 md:border-r border-border p-8 lg:p-12 flex flex-col justify-between">
          <div>
            <Link href="/" className="inline-flex items-center gap-2 text-xl font-bold text-foreground tracking-tight mb-16 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-sm">
                <span className="text-white text-sm font-bold tracking-normal">O</span>
              </div>
              OrbiSave
            </Link>

            <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-500" key={step}>
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold tracking-widest uppercase mb-2">
                Step {step + 1} of {TOTAL_STEPS}
              </div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground leading-tight">
                {meta.title}
              </h1>
              <p className="text-base text-muted-foreground leading-relaxed">
                {meta.desc}
              </p>
            </div>
          </div>
          
          <div className="hidden md:block mt-auto pt-12">
            <div className="flex gap-2">
              {STEP_META.map((_, i) => (
                <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i === step ? 'w-8 bg-primary' : i < step ? 'w-4 bg-primary/40' : 'w-4 bg-border'}`}></div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Form Area */}
        <div className="flex-1 flex flex-col relative overflow-y-auto custom-scrollbar">
          <div className="flex-1 w-full max-w-3xl mx-auto p-6 md:p-12 lg:p-20 pt-10">
            {apiError && (
              <div className="mb-8 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium flex gap-3 items-start animate-in slide-in-from-top-2">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" /> 
                <span className="leading-relaxed">{apiError}</span>
              </div>
            )}

            <form onSubmit={step === TOTAL_STEPS - 1 ? handleSubmit(onSubmit) : (e) => { e.preventDefault(); handleNext(); }} className="h-full flex flex-col">
              <div className="flex-1 pb-12">
                {step === 0 && <StepRole />}
                {step === 1 && <StepAccount />}
                {step === 2 && <StepGroup />}
                {step === 3 && <StepLocation />}
                {step === 4 && <StepReview />}
              </div>

              {/* Navigation Footer */}
              <div className="mt-auto pt-6 border-t border-border flex items-center justify-between gap-4 sticky bottom-0 bg-background/95 backdrop-blur py-4 -mx-2 px-2">
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={step === 0 || isSubmittingForm}
                  className="px-6 h-12 rounded-lg text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-muted transition-all disabled:opacity-0 disabled:pointer-events-none"
                >
                  Back
                </button>
                {step < TOTAL_STEPS - 1 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="px-8 h-12 bg-primary text-primary-foreground rounded-lg text-sm font-bold hover:bg-primary-hover transition-all shadow-sm flex items-center gap-2 ml-auto"
                  >
                    Continue <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isSubmittingForm}
                    className="px-8 h-12 bg-primary text-primary-foreground rounded-lg text-sm font-bold hover:bg-primary-hover transition-all shadow-sm disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2 ml-auto"
                  >
                    {isSubmittingForm ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Creating Group...
                      </>
                    ) : (
                      <>
                        Create My Group <Check className="w-4 h-4" />
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </FormProvider>
  )
}

// Remove ArrowRightIcon and Loader2Icon definitions at the end since we are using lucide-react now

