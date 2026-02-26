import { useEffect, useState } from "react";
import axios from "axios";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface Student {
    id: number;
    fullName: string;
    email: string | null;
    phone: string | null;
    university: { name: string };
    course: string | null;
    placeOfBirthProvince: string | null;
    placeOfBirthDistrict: string | null;
    placeOfBirthSector: string | null;
}

interface MigrateStudentModalProps {
    isOpen: boolean;
    onClose: () => void;
    student: Student | null;
    onMigrate: (data: {
        studentId: number;
        graduationYear: string;
        profession: string;
        phone: string;
        email: string;
        residenceProvince: string;
        residenceDistrict: string;
        residenceSector: string;
        provinceId?: string;
        districtId?: string;
        sectorId?: string;
    }) => Promise<void>;
}

interface LocationOption {
    id: string;
    name: string;
}

export function MigrateStudentModal({
    isOpen,
    onClose,
    student,
    onMigrate,
}: MigrateStudentModalProps) {
    const [loading, setLoading] = useState(false);
    const [provinces, setProvinces] = useState<LocationOption[]>([]);
    const [districts, setDistricts] = useState<LocationOption[]>([]);
    const [sectors, setSectors] = useState<LocationOption[]>([]);
    const [selectedProvinceId, setSelectedProvinceId] = useState("");
    const [selectedDistrictId, setSelectedDistrictId] = useState("");
    const [selectedSectorId, setSelectedSectorId] = useState("");
    const [formData, setFormData] = useState({
        graduationYear: new Date().getFullYear().toString(),
        profession: "",
        phone: "",
        email: "",
        residenceProvince: "",
        residenceDistrict: "",
        residenceSector: "",
    });

    const fetchDistricts = async (provinceId: string) => {
        if (!provinceId) {
            setDistricts([]);
            return [];
        }

        const response = await axios.get(`/api/locations?type=districts&parentId=${provinceId}`);
        const items = Array.isArray(response.data) ? response.data : [];
        setDistricts(items);
        return items as LocationOption[];
    };

    const fetchSectors = async (districtId: string) => {
        if (!districtId) {
            setSectors([]);
            return [];
        }

        const response = await axios.get(`/api/locations?type=sectors&parentId=${districtId}`);
        const items = Array.isArray(response.data) ? response.data : [];
        setSectors(items);
        return items as LocationOption[];
    };

    useEffect(() => {
        if (!isOpen || !student) return;

        let cancelled = false;

        const initialize = async () => {
            try {
                setFormData({
                    graduationYear: new Date().getFullYear().toString(),
                    profession: "",
                    phone: student.phone || "",
                    email: student.email || "",
                    residenceProvince: student.placeOfBirthProvince || "",
                    residenceDistrict: student.placeOfBirthDistrict || "",
                    residenceSector: student.placeOfBirthSector || "",
                });

                setSelectedProvinceId("");
                setSelectedDistrictId("");
                setSelectedSectorId("");
                setDistricts([]);
                setSectors([]);

                const provincesRes = await axios.get('/api/locations?type=provinces');
                if (cancelled) return;

                const provinceItems = Array.isArray(provincesRes.data) ? provincesRes.data as LocationOption[] : [];
                setProvinces(provinceItems);

                const matchedProvince = provinceItems.find((p) => p.name === student.placeOfBirthProvince);
                if (!matchedProvince) return;

                setSelectedProvinceId(matchedProvince.id);
                const districtItems = await fetchDistricts(matchedProvince.id);
                if (cancelled) return;

                const matchedDistrict = districtItems.find((d) => d.name === student.placeOfBirthDistrict);
                if (!matchedDistrict) return;

                setSelectedDistrictId(matchedDistrict.id);
                const sectorItems = await fetchSectors(matchedDistrict.id);
                if (cancelled) return;

                const matchedSector = sectorItems.find((s) => s.name === student.placeOfBirthSector);
                if (matchedSector) {
                    setSelectedSectorId(matchedSector.id);
                }
            } catch (error) {
                console.error('Failed to load location options', error);
            }
        };

        initialize();

        return () => {
            cancelled = true;
        };
    }, [isOpen, student]);

    const handleProvinceChange = async (provinceId: string) => {
        setSelectedProvinceId(provinceId);
        setSelectedDistrictId("");
        setSelectedSectorId("");
        setSectors([]);

        const provinceName = provinces.find((p) => p.id === provinceId)?.name || "";
        setFormData((prev) => ({
            ...prev,
            residenceProvince: provinceName,
            residenceDistrict: "",
            residenceSector: "",
        }));

        try {
            await fetchDistricts(provinceId);
        } catch (error) {
            console.error('Failed to load districts', error);
            setDistricts([]);
        }
    };

    const handleDistrictChange = async (districtId: string) => {
        setSelectedDistrictId(districtId);
        setSelectedSectorId("");

        const districtName = districts.find((d) => d.id === districtId)?.name || "";
        setFormData((prev) => ({
            ...prev,
            residenceDistrict: districtName,
            residenceSector: "",
        }));

        try {
            await fetchSectors(districtId);
        } catch (error) {
            console.error('Failed to load sectors', error);
            setSectors([]);
        }
    };

    const handleSectorChange = (sectorId: string) => {
        setSelectedSectorId(sectorId);
        const sectorName = sectors.find((s) => s.id === sectorId)?.name || "";
        setFormData((prev) => ({
            ...prev,
            residenceSector: sectorName,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!student) return;

        setLoading(true);
        try {
            await onMigrate({
                studentId: student.id,
                ...formData,
                provinceId: selectedProvinceId || undefined,
                districtId: selectedDistrictId || undefined,
                sectorId: selectedSectorId || undefined,
            });
            onClose();
        } catch (error) {
            console.error("Migration failed", error);
        } finally {
            setLoading(false);
        }
    };

    if (!student) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Migrate to Graduate</DialogTitle>
                    <DialogDescription>
                        Send <strong>{student.fullName}</strong> to the Graduates approval queue. An approver must review before final migration.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="graduationYear">Graduation Year</Label>
                            <Input
                                id="graduationYear"
                                value={formData.graduationYear}
                                onChange={(e) => setFormData({ ...formData, graduationYear: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="profession">Profession (Optional)</Label>
                            <Input
                                id="profession"
                                value={formData.profession}
                                onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
                                placeholder="e.g. Software Engineer"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone</Label>
                            <Input
                                id="phone"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>
                    </div>



                    <div className="grid grid-cols-3 gap-4 border-t pt-4">
                        <div className="col-span-3">
                            <Label className="text-sm font-semibold">Current Residence</Label>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="residenceProvince">Province</Label>
                            <Select value={selectedProvinceId} onValueChange={handleProvinceChange}>
                                <SelectTrigger id="residenceProvince">
                                    <SelectValue placeholder="Select province" />
                                </SelectTrigger>
                                <SelectContent>
                                    {provinces.map((province) => (
                                        <SelectItem key={province.id} value={province.id}>
                                            {province.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="residenceDistrict">District</Label>
                            <Select value={selectedDistrictId} onValueChange={handleDistrictChange} disabled={!selectedProvinceId}>
                                <SelectTrigger id="residenceDistrict">
                                    <SelectValue placeholder="Select district" />
                                </SelectTrigger>
                                <SelectContent>
                                    {districts.map((district) => (
                                        <SelectItem key={district.id} value={district.id}>
                                            {district.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="residenceSector">Sector</Label>
                            <Select value={selectedSectorId} onValueChange={handleSectorChange} disabled={!selectedDistrictId}>
                                <SelectTrigger id="residenceSector">
                                    <SelectValue placeholder="Select sector" />
                                </SelectTrigger>
                                <SelectContent>
                                    {sectors.map((sector) => (
                                        <SelectItem key={sector.id} value={sector.id}>
                                            {sector.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Migrating...
                                </>
                            ) : (
                                "Submit for Approval"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog >
    );
}
