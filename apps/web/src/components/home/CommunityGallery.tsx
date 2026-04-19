import Image from "next/image";

const BUILD_PHOTOS = [
	{
		src: "https://lh3.googleusercontent.com/aida-public/AB6AXuApkuArAiiORB8Lw9Sejdih12A0-AKrVNgNcgfDDOUNgNmIPoSR2nk_dKiMBTufS3jT7nDy6qhV0mh-hfK6sEl-B57vUAyTcDkv37HduoSuel3h-UtIVFbHwn92xNQdIuZGZY3_kV-KsjlgYIWbs05cq3rACxaTmDqJq4YznijB99BiW68ibXLzfseg3-8zOggGjMLt97FAQ8XPL7G9Hz33Kycg8WjMFujx_gul-3iO4OPH57Z4AnOUGX99-eWqSsxTGH8w_baBopg",
		alt: "Community build 1 — minimal desk setup",
	},
	{
		src: "https://lh3.googleusercontent.com/aida-public/AB6AXuCzj829CUhc8b2Z1s6j-HkUv2Vk83LXycqsezbfd4XaAV2Z8w0MTCec-B_67Ft68Ig-C778Q5qJy9f37WKchHfUnNT9kL3AMvt_JfDQf-iFgI9sXYYda87IPXdkCeURiFN4hbn4-_D7gnH_Zk2NV40EU4Nv1afMh4wS4rPzjgsu7jVbVOGwkJ-8h442-nVVkx7J5zw1NHgFtI_TT6VH3PdpknNkx4Rki88QggC-j3skUWDmJ03mDo3dHURYTyxo5mix6TsPLsG3q9k",
		alt: "Community build 2 — keycap detail",
	},
	{
		src: "https://lh3.googleusercontent.com/aida-public/AB6AXuAXIssWwq-BES6y7x6c1ucBgdT-hTsvCJJjAIJ74SyUDzSBCFSWpMP1x8esnuwUkPMkSNmzpbjgovBKM_lA7KQq6etPo7hO8wTam6ZaPPoUme9hcs0NNS6xcwBVOO5NzwcR5_vnLSit9DMt1qRirb8L8gqhMSRcLoQVoasiVl_CqjBo5h53tTAVYp45xSFB9D5Zo8qoy8pstypwVIf6zh-3v6RXNskQk6cijnPPdb3p7xUgr_1FF70bLHcXwP5e6ucnVKKd0jZ1o4",
		alt: "Community build 3 — atmospheric lighting",
	},
];

export function CommunityGallery() {
	return (
		<section className="py-16 px-6">
			<h2 className="text-2xl font-black tracking-tight uppercase mb-8">
				NHẬT KÝ BUILD
			</h2>
			{/* Bento grid: left col = 2 squares, right col = 1 tall spanning both rows */}
			<div className="grid grid-cols-2 gap-2">
				<div className="relative aspect-square overflow-hidden bg-surface-container-high">
					<Image
						src={BUILD_PHOTOS[0].src}
						alt={BUILD_PHOTOS[0].alt}
						fill
						className="object-cover"
						unoptimized
					/>
				</div>
				<div className="relative row-span-2 overflow-hidden bg-surface-container-high">
					<Image
						src={BUILD_PHOTOS[1].src}
						alt={BUILD_PHOTOS[1].alt}
						fill
						className="object-cover"
						unoptimized
					/>
				</div>
				<div className="relative aspect-square overflow-hidden bg-surface-container-high">
					<Image
						src={BUILD_PHOTOS[2].src}
						alt={BUILD_PHOTOS[2].alt}
						fill
						className="object-cover"
						unoptimized
					/>
				</div>
			</div>
			<p className="text-center mt-6 text-[10px] font-bold text-on-surface-variant tracking-[0.2em] uppercase">
				TAG @NOOBSTORE ĐỂ ĐƯỢC ĐĂNG LÊN
			</p>
		</section>
	);
}
