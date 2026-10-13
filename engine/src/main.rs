fn main(){
 let args:Vec<String>=std::env::args().collect();
 if args.len()<9 || args.len()>10 {eprintln!("Usage: oa2is_oil_native liters radius duration dt settle ramp output surface[0/1] [drive:0/1]");std::process::exit(2);}
 let parse=|i:usize|args[i].parse::<f64>().expect("numeric argument");
 oa2is_oil_engine::simulate_native(parse(1) as f32,parse(2) as f32,parse(3),parse(4) as f32,parse(5),parse(6),std::path::Path::new(&args[7]),args[8]=="1",args.get(9).map_or(true,|v|v!="0"));
}
